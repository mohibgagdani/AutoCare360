import { Document, Vehicle, Reminder } from '../models/index.js';
import { documentExpiryStatus } from '../models/Document.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, parseSort, paginate, buildPageMeta } from '../utils/pagination.js';
import { toObjectId } from '../utils/helpers.js';
import { addDays, startOfDay } from '../utils/dates.js';
import { buildDocumentFilter } from '../services/queryFilters.js';
import { syncDocumentReminder } from '../services/reminderService.js';
import { uploadFile, deleteFile } from '../services/storageService.js';
import { refreshVehicle } from '../services/scheduleService.js';

const POPULATE_VEHICLE = { path: 'vehicle', select: 'make model nickname registrationNumber color vehicleType' };

const assertVehicle = async (owner, vehicleId) => {
  if (!vehicleId) return;
  const exists = await Vehicle.exists({ _id: vehicleId, owner });
  if (!exists) throw ApiError.validation([{ field: 'vehicle', message: 'Select one of your vehicles' }]);
};

const withExpiry = (doc) => {
  const plain = doc.toObject ? doc.toObject() : doc;
  return { ...plain, expiry: documentExpiryStatus(plain) };
};

export const listDocuments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12 });
  const filter = buildDocumentFilter(req.user._id, req.query);
  let items;
  let meta;
  if (!req.query.sort || req.query.sort === 'expiryDate') {
    // "Expiring soonest" — documents without an expiry date go last, not first.
    const [rows, total] = await Promise.all([
      Document.aggregate([
        { $match: filter },
        { $addFields: { _expirySort: { $ifNull: ['$expiryDate', new Date('9999-12-31')] } } },
        { $sort: { _expirySort: 1, _id: 1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { _expirySort: 0 } },
      ]),
      Document.countDocuments(filter),
    ]);
    items = await Document.populate(rows, POPULATE_VEHICLE);
    meta = buildPageMeta(total, page, limit);
  } else {
    ({ items, meta } = await paginate(Document, filter, {
      page,
      limit,
      skip,
      sort: parseSort(req.query.sort, ['expiryDate', 'uploadDate', 'name', 'createdAt'], '-uploadDate'),
      populate: [POPULATE_VEHICLE],
    }));
  }

  const owner = toObjectId(req.user._id);
  const today = startOfDay();
  const [total, expired, expiring] = await Promise.all([
    Document.countDocuments({ owner }),
    Document.countDocuments({ owner, expiryDate: { $lt: today } }),
    Document.countDocuments({ owner, expiryDate: { $gte: today, $lte: addDays(today, 30) } }),
  ]);
  meta.counts = { total, expired, expiring, valid: total - expired - expiring };
  return sendSuccess(res, { data: items.map(withExpiry), meta });
});

export const getDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id }).populate(POPULATE_VEHICLE);
  if (!doc) throw ApiError.notFound('Document');
  return sendSuccess(res, { data: withExpiry(doc) });
});

export const createDocument = asyncHandler(async (req, res) => {
  await assertVehicle(req.user._id, req.body.vehicle);
  if (!req.file) throw ApiError.validation([{ field: 'file', message: 'Please attach the document file' }], 'A file is required');
  const file = await uploadFile(req.file, 'documents');
  const doc = new Document({
    ...req.body,
    owner: req.user._id,
    file,
    uploadDate: new Date(),
  });
  await doc.save();
  await syncDocumentReminder(doc);
  await doc.save();
  if (doc.vehicle) await refreshVehicle(doc.vehicle, { notifyAlerts: false });
  await doc.populate(POPULATE_VEHICLE);
  return sendSuccess(res, { status: 201, message: 'Document uploaded', data: withExpiry(doc) });
});

export const updateDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id });
  if (!doc) throw ApiError.notFound('Document');
  await assertVehicle(req.user._id, req.body.vehicle);
  const previousVehicle = doc.vehicle;
  Object.assign(doc, req.body);
  if (req.file) {
    const previous = doc.file;
    doc.file = await uploadFile(req.file, 'documents');
    doc.uploadDate = new Date();
    if (previous) await deleteFile(previous);
  }
  await syncDocumentReminder(doc);
  await doc.save();
  for (const v of new Set([previousVehicle, doc.vehicle].filter(Boolean).map(String))) {
    await refreshVehicle(v, { notifyAlerts: false });
  }
  await doc.populate(POPULATE_VEHICLE);
  return sendSuccess(res, { message: 'Document updated', data: withExpiry(doc) });
});

export const deleteDocument = asyncHandler(async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id });
  if (!doc) throw ApiError.notFound('Document');
  await Promise.all([Reminder.deleteMany({ document: doc._id }), deleteFile(doc.file)]);
  await doc.deleteOne();
  if (doc.vehicle) await refreshVehicle(doc.vehicle, { notifyAlerts: false });
  return sendSuccess(res, { message: 'Document deleted' });
});

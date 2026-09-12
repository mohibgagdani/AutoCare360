import { ServiceRecord } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, parseSort, paginate } from '../utils/pagination.js';
import { buildServiceRecordFilter, SERVICE_SORTS } from '../services/queryFilters.js';
import {
  createServiceRecord,
  updateServiceRecord,
  deleteServiceRecord,
  removeServicePhoto,
} from '../services/serviceRecordService.js';

export const listServiceRecords = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const filter = buildServiceRecordFilter(req.user._id, req.query);
  const { items, meta } = await paginate(ServiceRecord, filter, {
    page,
    limit,
    skip,
    sort: parseSort(req.query.sort, SERVICE_SORTS, '-serviceDate'),
    populate: [
      { path: 'vehicle', select: 'make model nickname registrationNumber color vehicleType' },
      { path: 'maintenanceItems.category', select: 'name color icon' },
    ],
  });

  const totals = await ServiceRecord.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: '$totalCost' }, avg: { $avg: '$totalCost' }, count: { $sum: 1 } } },
  ]);
  meta.totals = { total: totals[0]?.total || 0, average: totals[0]?.avg || 0, count: totals[0]?.count || 0 };
  return sendSuccess(res, { data: items, meta });
});

export const getServiceRecord = asyncHandler(async (req, res) => {
  const record = await ServiceRecord.findOne({ _id: req.params.id, owner: req.user._id })
    .populate('vehicle', 'make model nickname registrationNumber color vehicleType odometer')
    .populate('maintenanceItems.category', 'name color icon')
    .populate('expense', 'amount category paymentMethod');
  if (!record) throw ApiError.notFound('Service record');
  return sendSuccess(res, { data: record });
});

export const createServiceRecordHandler = asyncHandler(async (req, res) => {
  const record = await createServiceRecord(req.user._id, req.body, req.files || {});
  const completed = record.maintenanceItems.filter((i) => i.task).length;
  return sendSuccess(res, {
    status: 201,
    message: `Service record saved${completed ? ` · ${completed} maintenance item${completed > 1 ? 's' : ''} completed` : ''}`,
    data: record,
  });
});

export const updateServiceRecordHandler = asyncHandler(async (req, res) => {
  const record = await updateServiceRecord(req.user._id, req.params.id, req.body, req.files || {});
  return sendSuccess(res, { message: 'Service record updated', data: record });
});

export const deleteServiceRecordHandler = asyncHandler(async (req, res) => {
  await deleteServiceRecord(req.user._id, req.params.id);
  return sendSuccess(res, { message: 'Service record deleted' });
});

export const deletePhoto = asyncHandler(async (req, res) => {
  const record = await removeServicePhoto(req.user._id, req.params.id, req.params.photoId);
  return sendSuccess(res, { message: 'Photo removed', data: record });
});

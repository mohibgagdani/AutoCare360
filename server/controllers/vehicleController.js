import { Vehicle, VehicleType } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, parseSort, paginate } from '../utils/pagination.js';
import { searchRegex, toList } from '../utils/helpers.js';
import { uploadFile, deleteFile } from '../services/storageService.js';
import { syncSchedule, refreshVehicle, recordOdometer } from '../services/scheduleService.js';
import { assertValidCatalog, getVehicleOverview, deleteVehicleCascade, averageDailyUsage } from '../services/vehicleService.js';

const SORTS = ['createdAt', 'make', 'model', 'year', 'odometer', 'healthScore', 'registrationNumber', 'updatedAt'];
const SCHEDULE_FIELDS = ['vehicleType', 'fuelType', 'secondaryFuelType', 'transmission', 'make', 'model'];

const findOwned = async (req) => {
  const vehicle = await Vehicle.findOne({ _id: req.params.id, owner: req.user._id });
  if (!vehicle) throw ApiError.notFound('Vehicle');
  return vehicle;
};

export const listVehicles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12, maxLimit: 100 });
  const filter = { owner: req.user._id };
  const types = toList(req.query.vehicleType);
  if (types.length) filter.vehicleType = { $in: types };
  const fuels = toList(req.query.fuelType);
  if (fuels.length) filter.fuelType = { $in: fuels };
  filter.status = req.query.status === 'all' ? { $exists: true } : toList(req.query.status).length ? { $in: toList(req.query.status) } : 'active';
  if (req.query.health === 'attention') filter.healthScore = { $lt: 75 };
  if (req.query.search) {
    const rx = searchRegex(req.query.search);
    filter.$or = [{ make: rx }, { model: rx }, { nickname: rx }, { registrationNumber: rx }, { variant: rx }, { vin: rx }];
  }
  const { items, meta } = await paginate(Vehicle, filter, {
    page,
    limit,
    skip,
    sort: parseSort(req.query.sort, SORTS, '-createdAt'),
    select: '-odometerLogs -noteEntries',
  });
  return sendSuccess(res, { data: items, meta });
});

export const createVehicle = asyncHandler(async (req, res) => {
  await assertValidCatalog(req.body);
  const duplicate = await Vehicle.exists({
    owner: req.user._id,
    registrationNumber: req.body.registrationNumber.replace(/\s+/g, ' ').trim().toUpperCase(),
  });
  if (duplicate) {
    throw ApiError.conflict('A vehicle with this registration number already exists in your garage', [
      { field: 'registrationNumber', message: 'Registration number already added' },
    ]);
  }

  const image = req.file ? await uploadFile(req.file, 'vehicles') : undefined;
  const now = new Date();
  const vehicle = await Vehicle.create({
    ...req.body,
    owner: req.user._id,
    image,
    odometer: req.body.odometer ?? 0,
    odometerUpdatedAt: now,
    odometerLogs: [
      ...(req.body.purchaseDate ? [{ value: req.body.purchaseOdometer ?? 0, date: req.body.purchaseDate, source: 'initial' }] : []),
      ...(req.body.lastServiceDate && req.body.lastServiceOdometer != null
        ? [{ value: req.body.lastServiceOdometer, date: req.body.lastServiceDate, source: 'service' }]
        : []),
      { value: req.body.odometer ?? 0, date: now, source: 'initial' },
    ],
  });

  const schedule = await syncSchedule(vehicle, { now });
  const fresh = await Vehicle.findById(vehicle._id).select('-odometerLogs');
  return sendSuccess(res, {
    status: 201,
    message: `${vehicle.make} ${vehicle.model} added with ${schedule.created} maintenance items`,
    data: { vehicle: fresh, schedule },
  });
});

export const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  const type = await VehicleType.findOne({ code: vehicle.vehicleType }).lean();
  const data = vehicle.toJSON();
  data.type = type;
  data.averageDailyUsage = averageDailyUsage(vehicle);
  return sendSuccess(res, { data });
});

export const getVehicleOverviewHandler = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  const overview = await getVehicleOverview(vehicle);
  return sendSuccess(res, { data: overview });
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  if (req.body.vehicleType || req.body.fuelType || req.body.secondaryFuelType) {
    const merged = { ...vehicle.toObject(), ...req.body };
    await assertValidCatalog({
      vehicleType: merged.vehicleType,
      fuelType: merged.fuelType,
      secondaryFuelType: merged.secondaryFuelType,
    });
  }

  if (req.body.registrationNumber) {
    const reg = req.body.registrationNumber.replace(/\s+/g, ' ').trim().toUpperCase();
    const duplicate = await Vehicle.exists({ owner: req.user._id, registrationNumber: reg, _id: { $ne: vehicle._id } });
    if (duplicate) {
      throw ApiError.conflict('Another vehicle already uses this registration number', [
        { field: 'registrationNumber', message: 'Registration number already added' },
      ]);
    }
  }

  const scheduleChanged = SCHEDULE_FIELDS.some((f) => f in req.body && String(req.body[f] ?? '') !== String(vehicle[f] ?? ''));
  const previousOdometer = vehicle.odometer;
  const { odometer, ...rest } = req.body;
  Object.assign(vehicle, rest);

  if (req.file) {
    const previous = vehicle.image;
    vehicle.image = await uploadFile(req.file, 'vehicles');
    if (previous) await deleteFile(previous);
  }
  await vehicle.save();

  if (odometer !== undefined && odometer !== null && odometer !== previousOdometer) {
    if (odometer > previousOdometer) {
      await recordOdometer(vehicle, odometer, { source: 'manual' });
    } else {
      // Explicit correction from the edit form (e.g. a typo) — allowed but logged.
      await Vehicle.updateOne({ _id: vehicle._id }, { $set: { odometer, odometerUpdatedAt: new Date() } });
    }
  }

  const schedule = scheduleChanged ? await syncSchedule(vehicle._id) : null;
  if (!scheduleChanged) await refreshVehicle(vehicle._id);
  const fresh = await Vehicle.findById(vehicle._id).select('-odometerLogs');
  return sendSuccess(res, {
    message: schedule ? `Vehicle updated · schedule re-synced (${schedule.applicable} items)` : 'Vehicle updated',
    data: { vehicle: fresh, schedule },
  });
});

export const updateOdometer = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  const { odometer, date } = req.body;
  if (odometer < vehicle.odometer) {
    throw ApiError.validation(
      [{ field: 'odometer', message: `Reading cannot be lower than the current ${vehicle.odometer.toLocaleString('en-IN')}` }],
      'Odometer reading is lower than the current value'
    );
  }
  await recordOdometer(vehicle, odometer, { date: date || new Date(), source: 'manual' });
  const refreshed = await refreshVehicle(vehicle._id);
  const fresh = await Vehicle.findById(vehicle._id).select('-odometerLogs');
  return sendSuccess(res, { message: 'Odometer updated', data: { vehicle: fresh, health: refreshed?.health } });
});

export const uploadVehicleImage = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  if (!req.file) throw ApiError.badRequest('Please choose an image to upload');
  const previous = vehicle.image;
  vehicle.image = await uploadFile(req.file, 'vehicles');
  await vehicle.save();
  if (previous) await deleteFile(previous);
  return sendSuccess(res, { message: 'Vehicle photo updated', data: { image: vehicle.image } });
});

export const removeVehicleImage = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  if (vehicle.image) await deleteFile(vehicle.image);
  vehicle.image = undefined;
  await vehicle.save();
  return sendSuccess(res, { message: 'Vehicle photo removed' });
});

export const resyncSchedule = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  if (req.body?.includeRemoved && vehicle.excludedMaintenanceCodes.length) {
    vehicle.excludedMaintenanceCodes = [];
    await vehicle.save();
  }
  const result = await syncSchedule(vehicle);
  return sendSuccess(res, {
    message: `Schedule synced — ${result.created} added, ${result.updated} updated, ${result.removed} removed`,
    data: result,
  });
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  await deleteVehicleCascade(vehicle);
  return sendSuccess(res, { message: `${vehicle.make} ${vehicle.model} deleted` });
});

// ─── Notes ───────────────────────────────────────────────────────────────────
export const addNote = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  vehicle.noteEntries.unshift(req.body);
  await vehicle.save();
  return sendCreated(res, vehicle.noteEntries[0], 'Note added');
});

export const updateNote = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  const note = vehicle.noteEntries.id(req.params.noteId);
  if (!note) throw ApiError.notFound('Note');
  Object.assign(note, req.body);
  await vehicle.save();
  return sendSuccess(res, { message: 'Note updated', data: note });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const vehicle = await findOwned(req);
  const note = vehicle.noteEntries.id(req.params.noteId);
  if (!note) throw ApiError.notFound('Note');
  note.deleteOne();
  await vehicle.save();
  return sendSuccess(res, { message: 'Note deleted' });
});

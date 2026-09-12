/**
 * Maintenance template catalog. Each template targets vehicle types and/or groups
 * and can be narrowed by fuel, powertrain, transmission, make and model.
 * Templates that share a `code` are overrides — the most specific match wins.
 *
 * Intervals for hour-meter vehicles (tractors, construction equipment) are in hours.
 * Costs are indicative Indian market prices in INR.
 */

const LV = ['passenger', 'light_commercial']; // cars, SUVs, vans, pickups, mini-trucks
const CV = ['light_commercial', 'heavy_commercial'];
const HCV = ['heavy_commercial'];
const TW = ['two_wheeler'];
const AGRI = ['agricultural'];
const CE = ['construction'];
const TOW = ['towable'];
const ICE = ['ice', 'hybrid'];
const EV = ['ev'];
const SPARK_FUELS = ['petrol', 'cng', 'lpg', 'hybrid', 'phev'];

function T(code, name, category, opts) {
  const {
    km = null,
    mo = null,
    p = 'medium',
    cost = 0,
    min = 30,
    mode = 'professional',
    desc,
    notes,
    groups = [],
    types = [],
    fuels = [],
    pt = [],
    tx = [],
    makes = [],
    exclude = [],
    models = [],
  } = opts;
  return {
    code,
    name,
    category,
    description: desc,
    notes,
    intervalKm: km,
    intervalMonths: mo,
    priority: p,
    estimatedCost: cost,
    estimatedDurationMinutes: min,
    serviceMode: mode,
    vehicleGroups: groups,
    vehicleTypes: types,
    fuelTypes: fuels,
    powertrains: pt,
    transmissions: tx,
    makes,
    excludeMakes: exclude,
    models,
  };
}

export const templates = [
  // ─── ENGINE (cars, SUVs, vans, pickups — combustion & hybrid) ──────────────
  T('ENGINE_OIL', 'Engine oil change', 'engine', { groups: LV, pt: ICE, km: 10000, mo: 12, p: 'high', cost: 3500, min: 45, desc: 'Drain and refill engine oil with the manufacturer-specified grade.' }),
  T('OIL_FILTER', 'Oil filter replacement', 'engine', { groups: LV, pt: ICE, km: 10000, mo: 12, p: 'high', cost: 450, min: 15, desc: 'Replace the oil filter together with every oil change.' }),
  T('AIR_FILTER', 'Air filter replacement', 'engine', { groups: LV, pt: ICE, km: 20000, mo: 24, cost: 800, min: 15, mode: 'either', desc: 'Replace the engine intake air filter. Clean earlier in dusty conditions.' }),
  T('FUEL_FILTER', 'Fuel filter replacement', 'engine', { groups: LV, fuels: SPARK_FUELS, km: 40000, mo: 48, cost: 1500, min: 45, desc: 'Replace the in-line fuel filter to protect injectors.' }),
  T('FUEL_FILTER', 'Diesel fuel filter replacement', 'engine', { groups: LV, fuels: ['diesel'], km: 20000, mo: 24, p: 'high', cost: 2200, min: 45, desc: 'Diesel filters trap water and contaminants — replace and drain the separator.' }),
  T('SPARK_PLUG', 'Spark plug replacement', 'engine', { groups: LV, fuels: SPARK_FUELS, km: 40000, mo: 48, cost: 1600, min: 40, desc: 'Replace spark plugs for reliable ignition and fuel economy.' }),
  T('SPARK_PLUG', 'Spark plug replacement (CNG)', 'engine', { groups: LV, fuels: ['cng'], km: 20000, mo: 24, cost: 1800, min: 40, desc: 'CNG burns hotter — plugs wear roughly twice as fast as on petrol.' }),
  T('COOLANT_REPLACE', 'Coolant replacement', 'engine', { groups: LV, pt: ICE, km: 40000, mo: 36, cost: 2200, min: 60, desc: 'Flush and refill engine coolant to prevent corrosion and overheating.' }),
  T('COOLANT_CHECK', 'Coolant level inspection', 'engine', { groups: LV, pt: ICE, km: 5000, mo: 3, p: 'low', cost: 0, min: 5, mode: 'diy', desc: 'Check the coolant reservoir level with the engine cold.' }),
  T('DRIVE_BELT_INSPECT', 'Engine drive belt inspection', 'engine', { groups: LV, pt: ICE, km: 20000, mo: 12, cost: 300, min: 20, desc: 'Inspect accessory belts for cracks, glazing and tension.' }),
  T('TIMING_SYSTEM', 'Timing chain inspection', 'engine', { groups: LV, pt: ICE, km: 100000, mo: 72, cost: 1500, min: 60, desc: 'Check timing chain stretch, tensioner and guides.' }),
  T('TIMING_SYSTEM', 'Timing belt replacement', 'engine', { groups: LV, pt: ICE, makes: ['Volkswagen', 'Skoda', 'Renault', 'Fiat', 'Ford'], km: 60000, mo: 60, p: 'critical', cost: 9000, min: 180, desc: 'Belt-driven engines: replace the timing belt, tensioner and idlers. Failure can destroy the engine.' }),
  T('BATTERY_INSPECT', '12V battery inspection', 'electrical', { groups: LV, pt: ICE, km: 10000, mo: 6, cost: 0, min: 15, mode: 'either', desc: 'Test battery voltage, terminals and charging health.' }),
  T('ENGINE_DIAGNOSTICS', 'Engine diagnostics (OBD scan)', 'engine', { groups: LV, pt: ICE, km: 20000, mo: 12, cost: 800, min: 30, desc: 'Scan ECU fault codes and review live sensor data.' }),
  T('VALVE_CLEARANCE', 'Valve clearance inspection', 'engine', { groups: LV, fuels: ['petrol', 'cng', 'lpg'], km: 40000, mo: 48, p: 'low', cost: 1500, min: 90, desc: 'Check and adjust valve lash to specification.' }),
  T('PCV_INSPECT', 'PCV valve inspection', 'engine', { groups: LV, pt: ICE, km: 40000, mo: 36, p: 'low', cost: 400, min: 20, desc: 'Inspect the positive crankcase ventilation valve and hoses.' }),
  T('TURBO_INSPECT', 'Turbocharger inspection', 'engine', { groups: LV, fuels: ['diesel'], km: 40000, mo: 24, cost: 1200, min: 45, desc: 'Check turbo shaft play, oil leaks and boost hoses.' }),
  T('THROTTLE_BODY', 'Throttle body cleaning', 'engine', { groups: LV, fuels: SPARK_FUELS, km: 30000, mo: 24, p: 'low', cost: 800, min: 40, desc: 'Clean carbon deposits for a smooth idle.' }),
  T('WIPER_BLADES', 'Wiper blade replacement', 'body_general', { groups: LV, km: 20000, mo: 12, p: 'low', cost: 800, min: 10, mode: 'diy', desc: 'Replace worn wiper blades before the monsoon.' }),

  // ─── HYBRID ────────────────────────────────────────────────────────────────
  T('HYBRID_BATTERY', 'Hybrid battery health check', 'ev_system', { groups: LV, pt: ['hybrid'], km: 20000, mo: 12, p: 'high', cost: 1500, min: 45, desc: 'Check hybrid traction battery health and cooling fan.' }),
  T('HYBRID_INVERTER_COOLANT', 'Inverter coolant replacement', 'ev_system', { groups: LV, pt: ['hybrid'], km: 100000, mo: 60, cost: 3500, min: 60, desc: 'Replace the separate coolant loop for the hybrid inverter.' }),

  // ─── CNG / LPG / HYDROGEN ─────────────────────────────────────────────────
  T('CNG_KIT_INSPECT', 'CNG kit inspection', 'fuel_emissions', { groups: LV, fuels: ['cng'], km: 10000, mo: 6, p: 'high', cost: 800, min: 45, desc: 'Leak test, reducer and solenoid valve inspection.' }),
  T('CNG_CYLINDER_TEST', 'CNG cylinder hydro-test', 'fuel_emissions', { groups: LV, fuels: ['cng'], mo: 36, p: 'critical', cost: 2500, min: 120, desc: 'Statutory hydrostatic test of the CNG cylinder every 3 years.' }),
  T('CNG_FILTER', 'CNG filter replacement', 'fuel_emissions', { groups: LV, fuels: ['cng'], km: 20000, mo: 12, cost: 600, min: 20, desc: 'Replace the CNG low-pressure filter.' }),
  T('LPG_KIT_INSPECT', 'LPG kit inspection', 'fuel_emissions', { groups: LV, fuels: ['lpg'], km: 10000, mo: 6, p: 'high', cost: 800, min: 45, desc: 'Leak test and vaporiser inspection.' }),
  T('LPG_VAPORISER', 'LPG vaporiser service', 'fuel_emissions', { groups: LV, fuels: ['lpg'], km: 40000, mo: 24, cost: 1500, min: 60, desc: 'Service the LPG vaporiser/regulator diaphragm.' }),
  T('FUEL_CELL_INSPECT', 'Fuel cell stack inspection', 'ev_system', { groups: LV, pt: ['fcev'], km: 20000, mo: 12, p: 'critical', cost: 3000, min: 60, desc: 'Inspect fuel-cell stack, humidifier and air supply.' }),
  T('H2_TANK_INSPECT', 'Hydrogen tank inspection', 'fuel_emissions', { groups: LV, pt: ['fcev'], mo: 12, p: 'critical', cost: 2500, min: 60, desc: 'Inspect high-pressure hydrogen tanks and valves.' }),
  T('H2_SENSOR', 'Hydrogen leak sensor check', 'inspection', { groups: LV, pt: ['fcev'], mo: 12, p: 'critical', cost: 1200, min: 30, desc: 'Verify hydrogen leak detection sensors.' }),

  // ─── BRAKES ────────────────────────────────────────────────────────────────
  T('BRAKE_PAD_INSPECT', 'Brake pad inspection', 'brakes', { groups: LV, km: 10000, mo: 6, p: 'high', cost: 300, min: 20, desc: 'Measure pad thickness and check for uneven wear.' }),
  T('BRAKE_PAD_REPLACE', 'Brake pad replacement', 'brakes', { groups: LV, km: 40000, mo: 36, p: 'high', cost: 3500, min: 60, desc: 'Replace front brake pads.' }),
  T('BRAKE_PAD_REPLACE', 'Brake pad replacement (regen)', 'brakes', { groups: LV, fuels: ['electric'], km: 60000, mo: 48, p: 'high', cost: 4000, min: 60, desc: 'Regenerative braking reduces pad wear on EVs — longer interval.' }),
  T('BRAKE_DISC_INSPECT', 'Brake disc inspection', 'brakes', { groups: LV, km: 20000, mo: 12, cost: 0, min: 20, desc: 'Check disc thickness, scoring and run-out.' }),
  T('BRAKE_DISC_REPLACE', 'Brake disc replacement', 'brakes', { groups: LV, km: 80000, mo: 72, cost: 6500, min: 90, desc: 'Replace worn brake discs (usually with pads).' }),
  T('BRAKE_FLUID', 'Brake fluid replacement', 'brakes', { groups: LV, km: 40000, mo: 24, p: 'high', cost: 1200, min: 45, desc: 'Brake fluid absorbs moisture — replace every 2 years.' }),
  T('BRAKE_CALIPER', 'Brake caliper inspection', 'brakes', { groups: LV, km: 20000, mo: 12, cost: 500, min: 30, desc: 'Check caliper slides, seals and pistons.' }),
  T('BRAKE_HOSE', 'Brake hose inspection', 'brakes', { groups: LV, km: 20000, mo: 12, cost: 0, min: 15, desc: 'Inspect brake hoses for cracks and bulges.' }),
  T('ABS_INSPECT', 'ABS inspection', 'brakes', { groups: LV, km: 40000, mo: 24, cost: 800, min: 30, desc: 'Scan ABS module and check wheel-speed sensors.' }),

  // ─── TYRES & WHEELS ────────────────────────────────────────────────────────
  T('TYRE_PRESSURE', 'Tyre pressure check', 'tyres_wheels', { groups: LV, km: 1000, mo: 1, p: 'low', cost: 0, min: 10, mode: 'diy', desc: 'Check pressure (including spare) when tyres are cold.' }),
  T('TYRE_ROTATION', 'Tyre rotation', 'tyres_wheels', { groups: LV, km: 8000, mo: 6, cost: 400, min: 30, desc: 'Rotate tyres for even tread wear.' }),
  T('WHEEL_ALIGNMENT', 'Wheel alignment', 'tyres_wheels', { groups: LV, km: 10000, mo: 12, cost: 700, min: 45, desc: 'Align camber, caster and toe to specification.' }),
  T('WHEEL_BALANCING', 'Wheel balancing', 'tyres_wheels', { groups: LV, km: 10000, mo: 12, cost: 600, min: 40, desc: 'Balance wheels to remove vibration.' }),
  T('TYRE_REPLACE', 'Tyre replacement', 'tyres_wheels', { groups: LV, km: 50000, mo: 60, p: 'high', cost: 22000, min: 60, desc: 'Replace tyres at 1.6 mm tread or 5 years of age.' }),
  T('TYRE_REPLACE', 'Tyre replacement (EV)', 'tyres_wheels', { groups: LV, fuels: ['electric'], km: 40000, mo: 48, p: 'high', cost: 28000, min: 60, desc: 'Instant torque and battery weight wear EV tyres faster.' }),
  T('WHEEL_INSPECT', 'Wheel & rim inspection', 'tyres_wheels', { groups: LV, km: 10000, mo: 6, p: 'low', cost: 0, min: 15, desc: 'Check rims for bends, cracks and loose lug nuts.' }),
  T('SPARE_TYRE', 'Spare tyre inspection', 'tyres_wheels', { groups: LV, km: 10000, mo: 6, p: 'low', cost: 0, min: 10, mode: 'diy', desc: 'Check spare tyre pressure, jack and tools.' }),

  // ─── TRANSMISSION ──────────────────────────────────────────────────────────
  T('MT_OIL', 'Manual transmission oil', 'transmission', { groups: LV, pt: ICE, tx: ['manual', 'amt'], km: 60000, mo: 48, cost: 2000, min: 45, desc: 'Replace manual gearbox oil.' }),
  T('ATF', 'Automatic transmission fluid', 'transmission', { groups: LV, tx: ['automatic'], km: 60000, mo: 48, cost: 6500, min: 60, desc: 'Replace automatic transmission fluid.' }),
  T('CVT_FLUID', 'CVT fluid replacement', 'transmission', { groups: LV, tx: ['cvt'], km: 40000, mo: 48, p: 'high', cost: 5500, min: 60, desc: 'CVTs are sensitive to fluid condition — use the OEM-specified fluid.' }),
  T('DCT_FLUID', 'DCT fluid replacement', 'transmission', { groups: LV, tx: ['dct'], km: 60000, mo: 48, p: 'high', cost: 7500, min: 60, desc: 'Replace dual-clutch transmission fluid and filter.' }),
  T('TRANSMISSION_FILTER', 'Transmission filter replacement', 'transmission', { groups: LV, tx: ['automatic', 'cvt', 'dct'], km: 60000, mo: 48, cost: 2500, min: 45, desc: 'Replace the automatic transmission filter.' }),
  T('CLUTCH_INSPECT', 'Clutch inspection', 'transmission', { groups: LV, pt: ICE, tx: ['manual', 'amt'], km: 20000, mo: 12, cost: 400, min: 30, desc: 'Check clutch engagement point, slip and pedal free-play.' }),
  T('CLUTCH_REPLACE', 'Clutch replacement', 'transmission', { groups: LV, pt: ICE, tx: ['manual', 'amt'], km: 80000, mo: 84, cost: 12000, min: 240, desc: 'Replace clutch plate, pressure plate and release bearing.' }),
  T('EV_REDUCTION_GEAR', 'Reduction gear oil', 'transmission', { groups: [...LV, ...HCV], pt: EV, km: 60000, mo: 48, cost: 2500, min: 45, desc: 'Replace the EV single-speed reduction gearbox oil.' }),

  // ─── SUSPENSION & STEERING ─────────────────────────────────────────────────
  T('SHOCK_INSPECT', 'Shock absorber inspection', 'suspension_steering', { groups: LV, km: 20000, mo: 12, cost: 0, min: 20, desc: 'Check shock absorbers for leaks and damping loss.' }),
  T('SHOCK_REPLACE', 'Shock absorber replacement', 'suspension_steering', { groups: LV, km: 80000, mo: 72, cost: 12000, min: 120, desc: 'Replace worn shock absorbers in pairs.' }),
  T('STRUT_INSPECT', 'Strut inspection', 'suspension_steering', { groups: LV, km: 20000, mo: 12, cost: 0, min: 20, desc: 'Inspect strut mounts and bearings.' }),
  T('CONTROL_ARM', 'Control arm inspection', 'suspension_steering', { groups: LV, km: 20000, mo: 12, cost: 300, min: 20, desc: 'Check control arm bushes for play.' }),
  T('BALL_JOINT', 'Ball joint inspection', 'suspension_steering', { groups: LV, km: 20000, mo: 12, p: 'high', cost: 300, min: 20, desc: 'Check ball joints for wear and torn boots.' }),
  T('TIE_ROD', 'Tie rod inspection', 'suspension_steering', { groups: LV, km: 20000, mo: 12, p: 'high', cost: 300, min: 20, desc: 'Check tie rod ends for play.' }),
  T('STEERING_FLUID', 'Power steering fluid', 'suspension_steering', { groups: LV, pt: ICE, km: 40000, mo: 24, p: 'low', cost: 900, min: 30, desc: 'Replace hydraulic power steering fluid.', notes: 'Only for hydraulic power steering systems.' }),
  T('POWER_STEERING', 'Power steering inspection', 'suspension_steering', { groups: LV, km: 20000, mo: 12, cost: 0, min: 20, desc: 'Check steering rack, EPS motor and linkages.' }),

  // ─── ELECTRICAL ────────────────────────────────────────────────────────────
  T('ALTERNATOR', 'Alternator inspection', 'electrical', { groups: LV, pt: ICE, km: 40000, mo: 24, cost: 500, min: 30, desc: 'Test alternator charging output and bearings.' }),
  T('STARTER_MOTOR', 'Starter motor inspection', 'electrical', { groups: LV, pt: ICE, km: 40000, mo: 24, cost: 500, min: 30, desc: 'Check starter engagement and current draw.' }),
  T('LIGHTS_CHECK', 'Lights check', 'electrical', { groups: LV, km: 5000, mo: 3, p: 'low', cost: 0, min: 10, mode: 'diy', desc: 'Verify headlights, indicators, brake and reverse lamps.' }),
  T('FUSES_CHECK', 'Fuse inspection', 'electrical', { groups: LV, km: 20000, mo: 12, p: 'low', cost: 0, min: 15, desc: 'Inspect fuses and relays.' }),
  T('WIRING_INSPECT', 'Wiring inspection', 'electrical', { groups: LV, km: 40000, mo: 24, p: 'low', cost: 500, min: 30, desc: 'Look for chafed wiring and rodent damage.' }),
  T('ELECTRICAL_DIAG', 'Electrical diagnostics', 'electrical', { groups: LV, km: 20000, mo: 12, cost: 800, min: 30, desc: 'Scan all electronic modules for fault codes.' }),

  // ─── AC & CLIMATE ──────────────────────────────────────────────────────────
  T('AC_INSPECT', 'AC inspection', 'ac_climate', { groups: LV, types: ['bus'], km: 10000, mo: 12, cost: 500, min: 30, desc: 'Check vent temperature, pressures and condenser.' }),
  T('CABIN_FILTER', 'Cabin air filter replacement', 'ac_climate', { groups: LV, types: ['bus'], km: 15000, mo: 12, p: 'low', cost: 600, min: 15, mode: 'either', desc: 'Replace the pollen/cabin filter for clean cabin air.' }),
  T('AC_REFRIGERANT', 'AC refrigerant top-up', 'ac_climate', { groups: LV, types: ['bus'], km: 40000, mo: 24, cost: 2500, min: 60, desc: 'Evacuate, leak-test and recharge the refrigerant.' }),
  T('AC_COMPRESSOR', 'AC compressor inspection', 'ac_climate', { groups: LV, types: ['bus'], km: 40000, mo: 24, cost: 800, min: 30, desc: 'Check compressor clutch, noise and oil leaks.' }),
  T('CLIMATE_CONTROL', 'Climate control inspection', 'ac_climate', { groups: LV, km: 20000, mo: 12, p: 'low', cost: 300, min: 20, desc: 'Verify blend doors, blower speeds and sensors.' }),

  // ─── ELECTRIC VEHICLES (four-wheel) ────────────────────────────────────────
  T('HV_BATTERY_HEALTH', 'High-voltage battery health check', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 15000, mo: 12, p: 'critical', cost: 1500, min: 45, desc: 'Cell balance, isolation resistance and capacity check.' }),
  T('BATTERY_DIAGNOSTICS', 'Battery diagnostics', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 15000, mo: 12, p: 'high', cost: 1000, min: 40, desc: 'BMS log review and fault code scan.' }),
  T('BATTERY_COOLING', 'Battery cooling system inspection', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 20000, mo: 12, p: 'high', cost: 800, min: 40, desc: 'Check pumps, hoses and coolant flow for the battery pack.' }),
  T('BATTERY_COOLANT', 'Battery coolant replacement', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 80000, mo: 48, p: 'high', cost: 4500, min: 90, desc: 'Replace the battery thermal-loop coolant.' }),
  T('CHARGING_PORT', 'Charging port inspection', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 10000, mo: 6, cost: 0, min: 10, mode: 'either', desc: 'Inspect pins for burn marks, debris and latch wear.' }),
  T('CHARGING_CABLE', 'Charging cable inspection', 'ev_system', { groups: [...LV, ...HCV], pt: EV, mo: 6, cost: 0, min: 10, mode: 'diy', desc: 'Check the portable charger and cable insulation.' }),
  T('OBC_INSPECT', 'On-board charger inspection', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 20000, mo: 12, cost: 800, min: 30, desc: 'Verify AC charging efficiency and OBC cooling.' }),
  T('DC_FAST_CHARGE', 'DC fast charging system check', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 20000, mo: 12, cost: 800, min: 30, desc: 'Check DC contactors and fast-charge communication.' }),
  T('AUX_BATTERY', '12V auxiliary battery check', 'electrical', { groups: [...LV, ...HCV], pt: EV, km: 10000, mo: 12, cost: 0, min: 15, desc: 'EVs still rely on a 12V battery for electronics and wake-up.' }),
  T('REGEN_BRAKING', 'Regenerative braking system inspection', 'ev_system', { groups: LV, pt: [...EV, 'hybrid'], km: 15000, mo: 12, cost: 500, min: 30, desc: 'Verify regen levels and brake blending.' }),
  T('MOTOR_INSPECT', 'Electric motor inspection', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 30000, mo: 24, p: 'high', cost: 1200, min: 45, desc: 'Check motor mounts, bearing noise and insulation.' }),
  T('INVERTER_INSPECT', 'Inverter inspection', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 30000, mo: 24, p: 'high', cost: 1000, min: 45, desc: 'Inspect inverter cooling and connectors.' }),
  T('THERMAL_MGMT', 'Thermal management system check', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 20000, mo: 12, p: 'high', cost: 900, min: 40, desc: 'Heat pump, chiller and valve operation test.' }),
  T('FIRMWARE_UPDATE', 'Software / firmware update', 'ev_system', { groups: [...LV, ...HCV], pt: EV, mo: 6, cost: 0, min: 30, mode: 'either', desc: 'Install the latest BMS, motor and infotainment firmware.' }),
  T('HV_WIRING', 'High-voltage wiring inspection', 'ev_system', { groups: [...LV, ...HCV], pt: EV, km: 30000, mo: 24, p: 'critical', cost: 1200, min: 45, desc: 'Inspect orange HV cables, connectors and isolation.' }),
  T('BATTERY_SOH', 'Battery State of Health (SOH) report', 'ev_system', { groups: [...LV, ...HCV], pt: EV, mo: 6, p: 'high', cost: 0, min: 20, desc: 'Record SOH % to track degradation and warranty status.' }),

  // ─── TWO-WHEELERS (petrol) ─────────────────────────────────────────────────
  T('TW_ENGINE_OIL', 'Engine oil change', 'engine', { groups: TW, pt: ICE, km: 3000, mo: 6, p: 'high', cost: 450, min: 30, desc: 'Replace engine oil — two-wheeler oil also lubricates the gearbox and clutch.' }),
  T('TW_ENGINE_OIL', 'Engine oil change (scooter)', 'engine', { groups: TW, types: ['scooter'], pt: ICE, km: 4000, mo: 6, p: 'high', cost: 350, min: 20, desc: 'Scooter engine oil change.' }),
  T('TW_ENGINE_OIL', 'Engine oil change (Royal Enfield)', 'engine', { groups: TW, pt: ICE, makes: ['Royal Enfield'], km: 10000, mo: 12, p: 'high', cost: 900, min: 30, desc: 'Royal Enfield J-series engines specify a 10,000 km / 12 month oil interval.' }),
  T('TW_OIL_FILTER', 'Oil filter replacement', 'engine', { types: ['motorcycle'], pt: ICE, km: 6000, mo: 12, cost: 250, min: 15, desc: 'Replace the oil filter/strainer.' }),
  T('TW_OIL_FILTER', 'Oil filter replacement (Royal Enfield)', 'engine', { types: ['motorcycle'], pt: ICE, makes: ['Royal Enfield'], km: 10000, mo: 12, cost: 350, min: 15, desc: 'Replace oil filter along with every oil change.' }),
  T('TW_AIR_FILTER', 'Air filter replacement', 'engine', { groups: TW, pt: ICE, km: 12000, mo: 12, cost: 350, min: 15, mode: 'either', desc: 'Clean or replace the air filter element.' }),
  T('TW_SPARK_PLUG', 'Spark plug replacement', 'engine', { groups: TW, pt: ICE, km: 10000, mo: 12, cost: 200, min: 15, mode: 'either', desc: 'Replace the spark plug for easy starting.' }),
  T('TW_VALVE', 'Valve clearance adjustment', 'engine', { types: ['motorcycle'], pt: ICE, km: 10000, mo: 12, p: 'low', cost: 400, min: 60, desc: 'Check and set tappet clearance.' }),
  T('TW_COOLANT', 'Coolant replacement', 'engine', { types: ['motorcycle'], pt: ICE, exclude: ['Royal Enfield', 'Bajaj', 'Hero'], km: 20000, mo: 24, p: 'low', cost: 500, min: 30, desc: 'Replace coolant on liquid-cooled motorcycles.', notes: 'Liquid-cooled models only.' }),
  T('CHAIN_LUBE', 'Chain lubrication', 'drivetrain', { types: ['motorcycle', 'electric_motorcycle'], km: 600, mo: 1, p: 'low', cost: 150, min: 10, mode: 'diy', desc: 'Clean and lubricate the drive chain.' }),
  T('CHAIN_ADJUST', 'Chain slack adjustment', 'drivetrain', { types: ['motorcycle', 'electric_motorcycle'], km: 1000, mo: 3, cost: 100, min: 15, desc: 'Adjust chain slack to 20–30 mm.' }),
  T('CHAIN_REPLACE', 'Chain & sprocket replacement', 'drivetrain', { types: ['motorcycle', 'electric_motorcycle'], km: 20000, mo: 36, cost: 2800, min: 60, desc: 'Replace the chain and sprocket kit together.' }),
  T('TW_BRAKE_INSPECT', 'Brake inspection', 'brakes', { groups: TW, km: 3000, mo: 6, p: 'high', cost: 150, min: 15, desc: 'Check pad/shoe wear, lever play and brake lights.' }),
  T('TW_BRAKE_PADS', 'Brake pad replacement', 'brakes', { groups: TW, km: 15000, mo: 24, p: 'high', cost: 900, min: 30, desc: 'Replace disc brake pads.' }),
  T('TW_BRAKE_FLUID', 'Brake fluid replacement', 'brakes', { groups: TW, km: 20000, mo: 24, cost: 400, min: 30, desc: 'Replace DOT brake fluid.', notes: 'Hydraulic disc brake models.' }),
  T('TW_CLUTCH', 'Clutch adjustment', 'transmission', { types: ['motorcycle'], pt: ICE, km: 6000, mo: 12, cost: 200, min: 20, desc: 'Adjust clutch cable free-play.' }),
  T('THROTTLE_CABLE', 'Throttle cable adjustment', 'engine', { groups: TW, pt: ICE, km: 6000, mo: 12, p: 'low', cost: 100, min: 15, desc: 'Check throttle free-play and lubricate cables.' }),
  T('TW_BATTERY', 'Battery inspection', 'electrical', { groups: TW, pt: ICE, km: 6000, mo: 12, cost: 0, min: 10, desc: 'Check battery voltage and terminals.' }),
  T('TW_TYRE_CHECK', 'Tyre pressure & tread check', 'tyres_wheels', { groups: TW, km: 3000, mo: 3, p: 'high', cost: 0, min: 10, mode: 'diy', desc: 'Two-wheeler tyres are safety critical — check weekly.' }),
  T('TW_TYRE_REPLACE', 'Tyre replacement', 'tyres_wheels', { groups: TW, km: 25000, mo: 48, p: 'high', cost: 4500, min: 45, desc: 'Replace tyres at the tread wear indicator.' }),
  T('TW_SUSPENSION', 'Suspension inspection', 'suspension_steering', { groups: TW, km: 10000, mo: 12, cost: 300, min: 30, desc: 'Check fork seals and rear shock preload.' }),
  T('FORK_OIL', 'Front fork oil replacement', 'suspension_steering', { types: ['motorcycle', 'electric_motorcycle'], km: 20000, mo: 24, cost: 900, min: 60, desc: 'Replace telescopic fork oil.' }),
  T('SCOOTER_DRIVE_BELT', 'CVT drive belt replacement', 'drivetrain', { types: ['scooter'], km: 20000, mo: 24, cost: 1200, min: 45, desc: 'Replace the scooter CVT drive belt.' }),
  T('SCOOTER_CVT', 'CVT cleaning & inspection', 'drivetrain', { types: ['scooter'], km: 6000, mo: 12, cost: 400, min: 30, desc: 'Clean CVT housing, inspect rollers and clutch shoes.' }),
  T('SCOOTER_BRAKE_SHOE', 'Drum brake shoe adjustment', 'brakes', { types: ['scooter'], km: 3000, mo: 6, cost: 150, min: 15, desc: 'Adjust drum brake shoes and combi-brake linkage.' }),
  T('SIDE_STAND_SWITCH', 'Side-stand switch check', 'inspection', { types: ['scooter', 'motorcycle'], km: 6000, mo: 12, p: 'low', cost: 0, min: 5, mode: 'diy', desc: 'Verify the engine cut-off works with the side stand down.' }),
  T('TW_LIGHTS', 'Lights check', 'electrical', { groups: TW, km: 3000, mo: 3, p: 'low', cost: 0, min: 5, mode: 'diy', desc: 'Check headlight, tail light and indicators.' }),
  T('TW_HORN', 'Horn check', 'electrical', { groups: TW, km: 3000, mo: 3, p: 'low', cost: 0, min: 5, mode: 'diy', desc: 'Verify horn operation.' }),

  // ─── ELECTRIC TWO-WHEELERS ─────────────────────────────────────────────────
  T('ETW_BATTERY_HEALTH', 'Battery health check', 'ev_system', { groups: TW, pt: EV, km: 5000, mo: 6, p: 'critical', cost: 0, min: 20, desc: 'Check battery SOH, cell balance and range.' }),
  T('ETW_CHARGING_PORT', 'Charging port inspection', 'ev_system', { groups: TW, pt: EV, mo: 3, cost: 0, min: 5, mode: 'diy', desc: 'Inspect the charging socket for dirt and heat marks.' }),
  T('ETW_CHARGER', 'Portable charger inspection', 'ev_system', { groups: TW, pt: EV, mo: 6, cost: 0, min: 10, mode: 'diy', desc: 'Inspect the charger brick and cable.' }),
  T('ETW_MOTOR', 'Motor inspection', 'ev_system', { groups: TW, pt: EV, km: 10000, mo: 12, p: 'high', cost: 500, min: 30, desc: 'Check hub/mid-drive motor noise and mounts.' }),
  T('ETW_CONTROLLER', 'Motor controller inspection', 'ev_system', { groups: TW, pt: EV, km: 10000, mo: 12, p: 'high', cost: 500, min: 30, desc: 'Inspect controller connectors and error logs.' }),
  T('ETW_BATTERY_COOLING', 'Battery cooling inspection', 'ev_system', { groups: TW, pt: EV, km: 10000, mo: 12, cost: 400, min: 30, desc: 'Check battery vents / cooling where applicable.' }),
  T('ETW_12V', '12V auxiliary system check', 'electrical', { groups: TW, pt: EV, km: 10000, mo: 12, p: 'low', cost: 0, min: 10, desc: 'Check the DC-DC converter and 12V accessories.' }),
  T('ETW_FIRMWARE', 'Firmware / software update', 'ev_system', { groups: TW, pt: EV, mo: 3, cost: 0, min: 20, mode: 'either', desc: 'Install OTA updates for BMS, motor and dashboard.' }),
  T('ETW_DRIVE_BELT', 'Drive belt inspection', 'drivetrain', { groups: TW, pt: EV, makes: ['Ather', 'Ola'], km: 10000, mo: 12, cost: 300, min: 20, desc: 'Inspect belt tension and wear on belt-driven e-scooters.' }),

  // ─── COMMERCIAL (light + heavy) ────────────────────────────────────────────
  T('WHEEL_BEARINGS', 'Wheel bearing inspection & greasing', 'tyres_wheels', { groups: CV, km: 50000, mo: 12, p: 'high', cost: 3000, min: 90, desc: 'Check hub bearing play and repack grease.' }),
  T('DIFF_OIL', 'Differential oil change', 'transmission', { groups: CV, pt: ICE, km: 40000, mo: 24, cost: 3500, min: 45, desc: 'Replace rear differential / axle oil.' }),
  T('LEAF_SPRING', 'Leaf spring inspection & greasing', 'suspension_steering', { types: ['commercial_vehicle', 'pickup_truck'], km: 20000, mo: 12, cost: 1200, min: 45, desc: 'Check leaf springs, U-bolts and shackle bushes.' }),
  T('FLEET_INSPECTION', 'Monthly fleet inspection', 'inspection', { groups: CV, mo: 1, cost: 0, min: 30, mode: 'either', desc: 'Walk-around check: tyres, lights, leaks, documents.' }),
  T('SAFETY_INSPECTION', 'Safety inspection', 'inspection', { groups: CV, mo: 6, p: 'critical', cost: 1500, min: 60, desc: 'Pre-fitness safety inspection of brakes, steering, lights and body.' }),
  T('SPEED_GOVERNOR', 'Speed limiting device inspection', 'inspection', { groups: HCV, types: ['commercial_vehicle'], mo: 12, p: 'high', cost: 1000, min: 30, desc: 'Statutory speed governor calibration check.' }),
  T('FIRE_EXTINGUISHER', 'Fire extinguisher check', 'inspection', { types: ['bus', 'truck'], mo: 12, p: 'high', cost: 800, min: 15, desc: 'Check pressure gauge and refill date.' }),
  T('BUS_DOORS', 'Doors & emergency exit inspection', 'inspection', { types: ['bus'], mo: 3, p: 'critical', cost: 500, min: 30, desc: 'Test door mechanisms, sensors and emergency exits.' }),
  T('ENGINE_OIL', 'Engine oil change (heavy duty)', 'engine', { groups: HCV, pt: ICE, km: 20000, mo: 6, p: 'high', cost: 9500, min: 90, desc: 'Heavy-duty engine oil change (CI-4/CK-4).' }),
  T('OIL_FILTER', 'Oil filter replacement (heavy duty)', 'engine', { groups: HCV, pt: ICE, km: 20000, mo: 6, p: 'high', cost: 1500, min: 20, desc: 'Replace full-flow and bypass oil filters.' }),
  T('FUEL_FILTER', 'Fuel filters (primary & secondary)', 'engine', { groups: HCV, pt: ICE, km: 20000, mo: 6, p: 'high', cost: 2500, min: 45, desc: 'Replace primary and secondary fuel filters; drain water separator.' }),
  T('AIR_FILTER', 'Air filter replacement (heavy duty)', 'engine', { groups: HCV, pt: ICE, km: 30000, mo: 12, cost: 2500, min: 30, desc: 'Replace primary and safety air filter elements.' }),
  T('ADBLUE', 'AdBlue / DEF top-up', 'fuel_emissions', { groups: HCV, fuels: ['diesel'], km: 5000, mo: 3, p: 'high', cost: 1200, min: 15, mode: 'either', desc: 'Top up diesel exhaust fluid for the SCR system.' }),
  T('DEF_SYSTEM', 'DEF / SCR system inspection', 'fuel_emissions', { groups: HCV, fuels: ['diesel'], km: 40000, mo: 12, p: 'high', cost: 1500, min: 45, desc: 'Inspect dosing module, DEF filter and NOx sensors.' }),
  T('HCV_BRAKES', 'Brake system inspection', 'brakes', { groups: HCV, km: 10000, mo: 3, p: 'critical', cost: 1500, min: 60, desc: 'Check drum/lining wear, slack adjusters and brake chambers.' }),
  T('AIR_BRAKE', 'Air brake system inspection', 'brakes', { groups: HCV, km: 10000, mo: 3, p: 'critical', cost: 2000, min: 60, desc: 'Leak test air lines, tanks, valves and gauges.' }),
  T('AIR_DRYER', 'Air dryer cartridge replacement', 'brakes', { groups: HCV, km: 50000, mo: 12, p: 'high', cost: 3500, min: 45, desc: 'Replace the air dryer desiccant cartridge.' }),
  T('BRAKE_COMPRESSOR', 'Brake compressor inspection', 'brakes', { groups: HCV, km: 50000, mo: 12, p: 'high', cost: 3000, min: 60, desc: 'Check air compressor output and governor.' }),
  T('HCV_SUSPENSION', 'Leaf spring & suspension inspection', 'suspension_steering', { groups: HCV, km: 20000, mo: 6, p: 'high', cost: 1500, min: 60, desc: 'Inspect springs, hangers, bushes and air bags.' }),
  T('HCV_TYRES', 'Tyre inspection & pressure', 'tyres_wheels', { groups: HCV, km: 5000, mo: 1, p: 'high', cost: 0, min: 30, mode: 'either', desc: 'Check pressure, tread depth and dual spacing.' }),
  T('HCV_ALIGNMENT', 'Wheel alignment', 'tyres_wheels', { groups: HCV, km: 20000, mo: 6, cost: 1500, min: 60, desc: 'Multi-axle alignment to reduce tyre wear.' }),
  T('HCV_GEARBOX', 'Gearbox oil change', 'transmission', { groups: HCV, pt: ICE, km: 80000, mo: 24, cost: 6000, min: 60, desc: 'Replace transmission oil.' }),
  T('HCV_COOLANT', 'Coolant replacement', 'engine', { groups: HCV, pt: ICE, km: 80000, mo: 24, cost: 5000, min: 60, desc: 'Flush and refill extended-life coolant.' }),
  T('HCV_BATTERY', 'Battery inspection', 'electrical', { groups: HCV, km: 10000, mo: 3, cost: 0, min: 15, desc: 'Check both batteries, terminals and isolator.' }),
  T('HCV_LIGHTS', 'Lights, reflectors & indicators', 'electrical', { groups: HCV, km: 5000, mo: 1, cost: 0, min: 15, mode: 'either', desc: 'Verify all lamps and reflective tape.' }),
  T('PREVENTIVE_MAINTENANCE', 'Preventive maintenance (PM) service', 'body_general', { groups: HCV, km: 15000, mo: 3, p: 'high', cost: 6000, min: 240, desc: 'Scheduled PM service per fleet maintenance plan.' }),
  T('HCV_GREASING', 'Chassis greasing', 'body_general', { groups: HCV, km: 5000, mo: 1, cost: 800, min: 45, desc: 'Grease king pins, propeller shaft and spring pins.' }),

  // ─── TRACTORS (hour-meter) ─────────────────────────────────────────────────
  T('ENGINE_OIL', 'Engine oil change', 'engine', { groups: AGRI, pt: ICE, km: 250, mo: 6, p: 'high', cost: 3500, min: 60, desc: 'Replace engine oil every 250 hours.' }),
  T('OIL_FILTER', 'Oil filter replacement', 'engine', { groups: AGRI, pt: ICE, km: 250, mo: 6, p: 'high', cost: 600, min: 20, desc: 'Replace the engine oil filter.' }),
  T('AIR_FILTER', 'Air filter clean / replace', 'engine', { groups: AGRI, pt: ICE, km: 250, mo: 6, cost: 900, min: 20, mode: 'either', desc: 'Clean the primary element; replace when damaged.' }),
  T('FUEL_FILTER', 'Fuel filter replacement', 'engine', { groups: AGRI, pt: ICE, km: 500, mo: 12, p: 'high', cost: 800, min: 30, desc: 'Replace the fuel filter and bleed the system.' }),
  T('COOLANT_REPLACE', 'Coolant replacement', 'engine', { groups: AGRI, pt: ICE, km: 1000, mo: 24, cost: 1800, min: 60, desc: 'Flush and refill the radiator.' }),
  T('BATTERY_INSPECT', 'Battery inspection', 'electrical', { groups: [...AGRI, ...CE, 'other'], mo: 3, cost: 0, min: 15, mode: 'either', desc: 'Check electrolyte, terminals and charge.' }),
  T('HYDRAULIC_OIL', 'Hydraulic oil change', 'hydraulics', { groups: AGRI, km: 1000, mo: 12, p: 'high', cost: 5500, min: 90, desc: 'Replace hydraulic oil and clean the suction strainer.' }),
  T('TR_TRANSMISSION_OIL', 'Transmission oil change', 'transmission', { groups: AGRI, pt: ICE, km: 1000, mo: 12, p: 'high', cost: 6000, min: 90, desc: 'Replace transmission and rear-axle oil.' }),
  T('HYDRAULIC_SYSTEM', 'Hydraulic lift system inspection', 'hydraulics', { groups: AGRI, km: 250, mo: 6, p: 'high', cost: 500, min: 45, desc: 'Check lift arms, control valve and hoses.' }),
  T('PTO_INSPECT', 'PTO inspection', 'hydraulics', { groups: AGRI, km: 250, mo: 6, cost: 400, min: 30, desc: 'Check PTO engagement, shaft guard and splines.' }),
  T('TR_TYRES', 'Tyre pressure & condition', 'tyres_wheels', { groups: AGRI, km: 100, mo: 1, cost: 0, min: 15, mode: 'diy', desc: 'Check pressure and lug condition on all tyres.' }),
  T('TR_BELTS', 'Fan & alternator belt check', 'engine', { groups: AGRI, pt: ICE, km: 250, mo: 6, cost: 300, min: 20, desc: 'Check belt tension and cracks.' }),
  T('TR_BRAKES', 'Brake adjustment & inspection', 'brakes', { groups: AGRI, km: 250, mo: 6, p: 'high', cost: 600, min: 45, desc: 'Adjust brake pedal play and equalise both sides.' }),
  T('TR_CLUTCH', 'Clutch free-play adjustment', 'transmission', { groups: AGRI, pt: ICE, km: 250, mo: 6, cost: 500, min: 30, desc: 'Adjust main and PTO clutch free-play.' }),
  T('GREASING', 'Greasing points', 'body_general', { groups: AGRI, km: 50, mo: 1, cost: 200, min: 30, mode: 'diy', desc: 'Grease front axle pivot, steering and linkage points.' }),

  // ─── CONSTRUCTION EQUIPMENT (hour-meter) ───────────────────────────────────
  T('ENGINE_OIL', 'Engine oil change', 'engine', { groups: CE, pt: ICE, km: 250, mo: 6, p: 'high', cost: 12000, min: 90, desc: 'Replace engine oil every 250 hours.' }),
  T('OIL_FILTER', 'Oil filter replacement', 'engine', { groups: CE, pt: ICE, km: 250, mo: 6, p: 'high', cost: 2000, min: 30, desc: 'Replace engine oil filter.' }),
  T('FUEL_FILTER', 'Fuel filter replacement', 'engine', { groups: CE, pt: ICE, km: 500, mo: 12, p: 'high', cost: 2500, min: 45, desc: 'Replace fuel filters and drain the water separator.' }),
  T('AIR_FILTER', 'Air filter replacement', 'engine', { groups: CE, pt: ICE, km: 500, mo: 12, cost: 3500, min: 30, desc: 'Replace outer and inner air filter elements.' }),
  T('COOLANT_REPLACE', 'Coolant replacement', 'engine', { groups: CE, pt: ICE, km: 2000, mo: 24, cost: 4000, min: 60, desc: 'Flush and refill coolant.' }),
  T('CE_HYDRAULIC_OIL', 'Hydraulic oil change', 'hydraulics', { groups: CE, km: 2000, mo: 24, p: 'high', cost: 25000, min: 180, desc: 'Replace hydraulic oil.' }),
  T('CE_HYDRAULIC_FILTER', 'Hydraulic filter replacement', 'hydraulics', { groups: CE, km: 500, mo: 12, p: 'high', cost: 4500, min: 60, desc: 'Replace return and pilot filters.' }),
  T('CE_GREASING', 'Pins & bushes greasing', 'body_general', { groups: CE, km: 50, mo: 1, p: 'high', cost: 500, min: 30, mode: 'either', desc: 'Grease boom, arm and bucket pins.' }),
  T('CE_UNDERCARRIAGE', 'Track & undercarriage inspection', 'suspension_steering', { groups: CE, km: 250, mo: 3, p: 'high', cost: 1500, min: 60, desc: 'Check track tension, rollers, idlers and sprockets.' }),
  T('CE_SWING', 'Swing bearing lubrication', 'hydraulics', { groups: CE, km: 500, mo: 6, cost: 2000, min: 60, desc: 'Lubricate the swing bearing and gear.' }),
  T('CE_SAFETY', 'Safety inspection', 'inspection', { groups: CE, mo: 6, p: 'critical', cost: 2000, min: 60, desc: 'ROPS, seat belt, alarms, mirrors and lights.' }),

  // ─── TRAILERS ──────────────────────────────────────────────────────────────
  T('TRL_BEARINGS', 'Wheel bearing repack', 'tyres_wheels', { groups: TOW, km: 20000, mo: 12, p: 'high', cost: 1500, min: 90, desc: 'Clean, inspect and repack wheel bearings.' }),
  T('TRL_BRAKES', 'Brake inspection', 'brakes', { groups: TOW, km: 10000, mo: 6, p: 'high', cost: 800, min: 45, desc: 'Check brake shoes, magnets or surge actuator.' }),
  T('TRL_TYRES', 'Tyre inspection', 'tyres_wheels', { groups: TOW, km: 5000, mo: 3, p: 'high', cost: 0, min: 15, mode: 'diy', desc: 'Check pressure, sidewalls and tyre age.' }),
  T('TRL_LIGHTS', 'Lights & wiring check', 'electrical', { groups: TOW, mo: 1, cost: 0, min: 10, mode: 'diy', desc: 'Test brake, indicator and marker lights.' }),
  T('TRL_COUPLING', 'Hitch & coupling inspection', 'inspection', { groups: TOW, mo: 3, p: 'critical', cost: 0, min: 15, mode: 'diy', desc: 'Check coupler, safety chains and breakaway cable.' }),
  T('TRL_SUSPENSION', 'Suspension & axle inspection', 'suspension_steering', { groups: TOW, km: 20000, mo: 12, cost: 500, min: 30, desc: 'Inspect springs, shackles and axle U-bolts.' }),

  // ─── OTHER ─────────────────────────────────────────────────────────────────
  T('GENERAL_SERVICE', 'General service', 'body_general', { groups: ['other'], km: 10000, mo: 12, cost: 3000, min: 120, desc: 'Complete periodic service per the owner’s manual.' }),
  T('GENERAL_INSPECTION', 'General safety inspection', 'inspection', { groups: ['other'], mo: 6, cost: 500, min: 30, desc: 'Brakes, tyres, lights and fluid levels.' }),
];

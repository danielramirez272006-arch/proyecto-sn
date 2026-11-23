const { BaseModel } = require('./base-model');
const { query } = require('../shared/config/database');

const RoleModel = new BaseModel({
  name: 'Role',
  tableName: 'roles',
  primaryKey: 'id',
  idPrefix: 'role',
  columns: ['id', 'name', 'description', 'created_at'],
  readOnlyColumns: ['id', 'created_at'],
  schema: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 64 },
    description: { type: 'string', maxLength: 500 }
  }
});

const UserRoleModel = new BaseModel({
  name: 'UserRole',
  tableName: 'user_roles',
  primaryKey: 'user_id',
  idPrefix: 'ur',
  columns: ['user_id', 'role_id', 'assigned_at'],
  readOnlyColumns: ['assigned_at'],
  schema: {
    user_id: { type: 'string', required: true, maxLength: 64 },
    role_id: { type: 'string', required: true, maxLength: 64 }
  }
});

const UserConsentModel = new BaseModel({
  name: 'UserConsent',
  tableName: 'user_consents',
  primaryKey: 'id',
  idPrefix: 'cns',
  columns: [
    'id',
    'user_id',
    'terms_version',
    'privacy_accepted',
    'cookies_preferences_json',
    'ip_address',
    'user_agent',
    'accepted_at'
  ],
  readOnlyColumns: ['id', 'user_id', 'accepted_at'],
  jsonColumns: ['cookies_preferences_json'],
  encryptedColumns: ['ip_address'],
  schema: {
    user_id: { type: 'string', required: true, maxLength: 64 },
    terms_version: { type: 'string', required: true, maxLength: 64 }
  }
});

const UserPetModel = new BaseModel({
  name: 'UserPet',
  tableName: 'user_pets',
  primaryKey: 'id',
  idPrefix: 'pet',
  columns: [
    'id',
    'user_id',
    'name',
    'species',
    'breed',
    'weight_kg',
    'age_years',
    'microchip_id',
    'color_coat',
    'allergies_text',
    'photo_url',
    'created_at',
    'updated_at'
  ],
  readOnlyColumns: ['id', 'user_id', 'created_at'],
  encryptedColumns: ['microchip_id'],
  schema: {
    user_id: { type: 'string', required: true, maxLength: 64 },
    name: { type: 'string', required: true, minLength: 1, maxLength: 120 },
    weight_kg: { type: 'number', min: 0.1, max: 150 },
    age_years: { type: 'number', min: 0, max: 40 }
  }
});

const PasswordResetTokenModel = new BaseModel({
  name: 'PasswordResetToken',
  tableName: 'password_reset_tokens',
  primaryKey: 'id',
  idPrefix: 'prt',
  columns: ['id', 'user_id', 'token_hash', 'expires_at', 'used_at', 'created_at'],
  hiddenColumns: ['token_hash'],
  readOnlyColumns: ['id', 'user_id', 'token_hash', 'created_at'],
  schema: {
    user_id: { type: 'string', required: true, maxLength: 64 },
    token_hash: { type: 'string', required: true, maxLength: 128 }
  }
});

const DataDeletionRequestModel = new BaseModel({
  name: 'DataDeletionRequest',
  tableName: 'data_deletion_requests',
  primaryKey: 'id',
  idPrefix: 'del',
  columns: [
    'id',
    'user_id',
    'email',
    'reason',
    'status',
    'retained_legal_summary',
    'requested_at',
    'processed_at'
  ],
  readOnlyColumns: ['id', 'user_id', 'requested_at'],
  schema: {
    user_id: { type: 'string', required: true, maxLength: 64 },
    email: { type: 'email', required: true, maxLength: 255 },
    status: { type: 'string', enum: ['pending', 'completed', 'rejected'] }
  }
});

const AiInteractionLogModel = new BaseModel({
  name: 'AiInteractionLog',
  tableName: 'ai_interaction_logs',
  primaryKey: 'id',
  idPrefix: 'ailog',
  columns: [
    'id',
    'agent_name',
    'invoked_by',
    'invoked_role',
    'input_summary',
    'output_summary',
    'provider',
    'model',
    'latency_ms',
    'status',
    'created_at'
  ],
  readOnlyColumns: ['id', 'created_at'],
  schema: {
    agent_name: { type: 'string', required: true, maxLength: 96 },
    latency_ms: { type: 'number', min: 0, max: 600000 },
    status: { type: 'string', enum: ['success', 'error', 'blocked'] }
  }
});

const PlaceModel = new BaseModel({
  name: 'Place',
  tableName: 'places',
  primaryKey: 'id',
  idPrefix: 'plc',
  columns: [
    'id',
    'name',
    'category',
    'address',
    'lat',
    'lng',
    'phone',
    'verified',
    'attributes_metadata',
    'created_at',
    'updated_at'
  ],
  readOnlyColumns: ['id', 'created_at'],
  jsonColumns: ['attributes_metadata'],
  schema: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 200 },
    lat: { type: 'number', min: -90, max: 90 },
    lng: { type: 'number', min: -180, max: 180 }
  }
});

const PlacePhotoModel = new BaseModel({
  name: 'PlacePhoto',
  tableName: 'place_photos',
  primaryKey: 'id',
  idPrefix: 'pho',
  columns: [
    'id',
    'place_id',
    'photo_url',
    'storage_bucket',
    'storage_object_path',
    'source_type',
    'attribution_text',
    'license_type',
    'status',
    'is_cover',
    'width',
    'height',
    'content_hash',
    'uploaded_by',
    'reviewed_by',
    'reviewed_at',
    'rejection_reason',
    'created_at'
  ],
  readOnlyColumns: ['id', 'content_hash', 'created_at'],
  schema: {
    place_id: { type: 'string', required: true, maxLength: 120 },
    status: { type: 'string', enum: ['pending_review', 'approved', 'rejected', 'retracted'] }
  }
});

const EventModel = new BaseModel({
  name: 'Event',
  tableName: 'events',
  primaryKey: 'id',
  idPrefix: 'evt',
  columns: [
    'id',
    'title',
    'description',
    'category',
    'start_time',
    'end_time',
    'lat',
    'lng',
    'address',
    'organizer_id',
    'status',
    'created_at'
  ],
  readOnlyColumns: ['id', 'created_at'],
  schema: {
    title: { type: 'string', required: true, minLength: 2, maxLength: 200 }
  }
});

class UserEntityModel extends BaseModel {
  constructor() {
    super({
      name: 'User',
      tableName: 'users',
      primaryKey: 'id',
      idPrefix: 'usr',
      columns: [
        'id',
        'name',
        'email',
        'password_hash',
        'role',
        'gps_trust_score',
        'created_at',
        'updated_at'
      ],
      hiddenColumns: ['password_hash'],
      readOnlyColumns: ['id', 'role', 'created_at'],
      schema: {
        name: { type: 'string', required: true, minLength: 2, maxLength: 160 },
        email: { type: 'email', required: true, maxLength: 255 },
        role: { type: 'string', enum: ['admin', 'organizer', 'merchant', 'business_owner', 'client', 'guest'] },
        gps_trust_score: { type: 'number', min: 0, max: 100 }
      }
    });
  }

  /**
   * Carga un usuario junto con sus relaciones en 3FN (roles asignados, consentimientos Ley 8968 y mascotas)
   * e incluye un sello criptográfico HMAC de integridad sin exponer jamás password_hash.
   */
  async findWithRelations(userId, { tx = null } = {}) {
    const user = await this.findByPk(userId, { includeSecrets: false, withIntegritySeal: true, tx });
    if (!user) return null;

    const [rolesRows, consents, pets] = await Promise.all([
      query(
        `SELECT r.id, r.name, r.description, ur.assigned_at
         FROM user_roles ur
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ?`,
        [userId]
      ).catch(() => []),
      UserConsentModel.findAll({ where: { user_id: userId }, orderBy: 'accepted_at', orderDir: 'DESC', tx }).catch(() => []),
      UserPetModel.findAll({ where: { user_id: userId }, tx }).catch(() => [])
    ]);

    return {
      ...user,
      roles: rolesRows || [],
      consents: consents || [],
      pets: pets || []
    };
  }
}

const UserModel = new UserEntityModel();

const ALL_ORM_MODELS = [
  UserModel,
  RoleModel,
  UserRoleModel,
  UserConsentModel,
  UserPetModel,
  PasswordResetTokenModel,
  DataDeletionRequestModel,
  AiInteractionLogModel,
  PlaceModel,
  PlacePhotoModel,
  EventModel
];

function getOrmSecurityCatalog() {
  return ALL_ORM_MODELS.map((m) => m.getSecurityDescriptor());
}

module.exports = {
  UserModel,
  RoleModel,
  UserRoleModel,
  UserConsentModel,
  UserPetModel,
  PasswordResetTokenModel,
  DataDeletionRequestModel,
  AiInteractionLogModel,
  PlaceModel,
  PlacePhotoModel,
  EventModel,
  ALL_ORM_MODELS,
  getOrmSecurityCatalog
};

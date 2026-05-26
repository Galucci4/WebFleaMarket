export const ROLES = {
  BUYER: 'buyer',
  VENDOR: 'vendor',
  ADMINISTRATOR: 'administrator'
}

export const LISTING_STATUS = {
  ACTIVE: 'active',
  SOLD: 'sold',
  DEACTIVATED: 'deactivated'
}

export const MODERATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended'
}

export const EVENT_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  CLOSED: 'closed'
}

export const REPORT_STATUS = {
  OPEN: 'open',
  REVIEWED: 'reviewed'
}

// Values stored in reports.adminAction
export const REPORT_ADMIN_ACTION = {
  DISMISSED: 'dismissed',
  LISTING_REMOVED: 'listing_removed',
  VENDOR_SUSPENDED: 'vendor_suspended'
}

/**
 * Deterministic conversation ID — identical for both participants
 * regardless of who messages first.
 */
export function conversationIdFor(userA, userB, listingId) {
  return [userA, userB].sort().join('_') + '_' + listingId
}

// Canonical product categories for the SU Flea Market.
// Used in listing forms, filters, and seed data.
export const CATEGORIES = [
  'Accessories',
  'Clothing',
  'Food',
  'Handcrafted',
  'Imported Goods',
  'Other'
]

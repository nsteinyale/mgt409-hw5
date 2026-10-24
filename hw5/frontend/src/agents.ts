import type { ComponentType } from 'react'
import { Epona, Ganondorf, Goron, Ocarina, Sword, Zora } from './components/Art'

export interface Persona {
  key: string
  role: string // the real job on the team
  title: string // the Twilight name on the board
  color: string
  Icon: ComponentType<{ size?: number; className?: string }>
  motto: string
}

export const PERSONAS: Record<string, Persona> = {
  Boss: {
    key: 'Boss', role: 'Boss', title: 'The Hero', color: '#e8c15a', Icon: Sword,
    motto: 'Reads the quest, picks the party, sets the ticket.',
  },
  Inventory: {
    key: 'Inventory', role: 'Inventory', title: 'Goron Stockkeeper', color: '#e0904a', Icon: Goron,
    motto: 'Knows every rock on every shelf.',
  },
  Accounting: {
    key: 'Accounting', role: 'Accounting', title: 'Zora Treasurer', color: '#5cc8e8', Icon: Zora,
    motto: 'Counts rupees like river stones. Never spends one.',
  },
  Facilities: {
    key: 'Facilities', role: 'Facilities', title: 'Epona of the Ranch', color: '#c98454', Icon: Epona,
    motto: 'Guards the stable: the lease, the landlord, the rent.',
  },
  CustomerService: {
    key: 'CustomerService', role: 'Customer Service', title: 'Ocarina Herald', color: '#9d8cff', Icon: Ocarina,
    motto: 'Plays the customer a true song, never a false promise.',
  },
}

export const GANON: Persona = {
  key: 'Ganondorf', role: 'Guardrail', title: 'Ganondorf', color: '#e0533a', Icon: Ganondorf,
  motto: 'Appears when a rule stops the party.',
}

export const PARTY = ['Boss', 'Inventory', 'Accounting', 'Facilities', 'CustomerService'] as const

export function persona(agent: string): Persona {
  return PERSONAS[agent] ?? GANON
}

export const QUEST_NAMES: Record<number, string> = {
  101: 'The Missing Tee',
  102: "The Landlord's Letter",
  103: 'The Hoodie Hoard',
}

/** Friendlier labels for MCP tools on the board. */
export const TOOL_LABELS: Record<string, string> = {
  get_shop_date: 'read the sundial',
  list_open_tickets: 'scan the quest board',
  get_ticket: 'read the quest',
  add_ticket_note: 'inscribe a note',
  set_ticket_status: 'set the quest status',
  check_stock: 'check the shelf',
  list_stock_by_size: 'count every size',
  get_pricing: 'weigh the price',
  list_vendors: 'call the merchants',
  get_invoice: 'read the invoice',
  get_lease: 'unroll the lease',
  get_cash_balance: 'count the rupees',
  list_payments: 'search past payments',
  ask_agent: 'summon',
}

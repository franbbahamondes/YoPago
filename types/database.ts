export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Datos de transferencia completos (5 requeridos + 2 opcionales).
 * Solo se renderiza/comparte cuando los 5 requeridos están presentes
 * — la validación vive en lib/transfer-data.ts.
 */
export type TransferData = {
  nombre: string
  rut: string
  banco: string
  tipo_cuenta: string
  numero: string
  email?: string | null
  alias?: string | null
}

/** @deprecated — usar TransferData. Se mantiene por compat con código legacy. */
export type DatosTransferencia = TransferData

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bills: {
        Row: {
          id: string
          slug: string
          nombre: string
          creador_nombre: string | null
          /** @deprecated — los datos viven en la tabla transfer_data. Columna existe solo para migración legacy. */
          datos_transferencia: Json | null
          imagen_url: string | null
          tip_percent: number
          global_discount_amount: number
          global_discount_percent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          nombre: string
          creador_nombre?: string | null
          datos_transferencia?: Json | null
          imagen_url?: string | null
          tip_percent?: number
          global_discount_amount?: number
          global_discount_percent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          nombre?: string
          creador_nombre?: string | null
          datos_transferencia?: Json | null
          imagen_url?: string | null
          tip_percent?: number
          global_discount_amount?: number
          global_discount_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      transfer_data: {
        Row: {
          id: string
          bill_id: string
          nombre: string | null
          rut: string | null
          banco: string | null
          tipo_cuenta: string | null
          numero: string | null
          email: string | null
          alias: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          nombre?: string | null
          rut?: string | null
          banco?: string | null
          tipo_cuenta?: string | null
          numero?: string | null
          email?: string | null
          alias?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          nombre?: string | null
          rut?: string | null
          banco?: string | null
          tipo_cuenta?: string | null
          numero?: string | null
          email?: string | null
          alias?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_data_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: true
            referencedRelation: "bills"
            referencedColumns: ["id"]
          }
        ]
      }
      participants: {
        Row: {
          id: string
          bill_id: string
          nombre: string
          client_id: string
          paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          nombre: string
          client_id: string
          paid?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          nombre?: string
          client_id?: string
          paid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "participants_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          }
        ]
      }
      items: {
        Row: {
          id: string
          bill_id: string
          descripcion: string
          precio: number
          cantidad: number
          descuento_monto: number
          descuento_porcentaje: number
          orden: number
          created_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          descripcion: string
          precio: number
          cantidad?: number
          descuento_monto?: number
          descuento_porcentaje?: number
          orden?: number
          created_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          descripcion?: string
          precio?: number
          cantidad?: number
          descuento_monto?: number
          descuento_porcentaje?: number
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          }
        ]
      }
      item_assignments: {
        Row: {
          item_id: string
          participant_id: string
        }
        Insert: {
          item_id: string
          participant_id: string
        }
        Update: {
          item_id?: string
          participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Bill = Database["public"]["Tables"]["bills"]["Row"]
export type Participant = Database["public"]["Tables"]["participants"]["Row"]
export type Item = Database["public"]["Tables"]["items"]["Row"]
export type ItemAssignment = Database["public"]["Tables"]["item_assignments"]["Row"]
export type TransferDataRow = Database["public"]["Tables"]["transfer_data"]["Row"]

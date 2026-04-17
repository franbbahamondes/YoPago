export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type DatosTransferencia = {
  nombre: string
  banco: string
  tipo_cuenta: string
  numero: string
  rut: string
  email: string
  alias: string
}

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

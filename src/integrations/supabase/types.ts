export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      anamnesis_questions: {
        Row: {
          anamnesis_type_id: string
          created_at: string
          id: string
          is_required: boolean | null
          options: Json | null
          order_index: number
          question_text: string
          question_type: string
        }
        Insert: {
          anamnesis_type_id: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_index?: number
          question_text: string
          question_type?: string
        }
        Update: {
          anamnesis_type_id?: string
          created_at?: string
          id?: string
          is_required?: boolean | null
          options?: Json | null
          order_index?: number
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_questions_anamnesis_type_id_fkey"
            columns: ["anamnesis_type_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_types"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_records: {
        Row: {
          anamnesis_type_id: string
          answers: Json
          client_id: string
          completed_at: string | null
          created_at: string
          filled_by: string
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          anamnesis_type_id: string
          answers?: Json
          client_id: string
          completed_at?: string | null
          created_at?: string
          filled_by: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          anamnesis_type_id?: string
          answers?: Json
          client_id?: string
          completed_at?: string | null
          created_at?: string
          filled_by?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_records_anamnesis_type_id_fkey"
            columns: ["anamnesis_type_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      anamnesis_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      appointment_notifications: {
        Row: {
          appointment_date: string
          appointment_time: string
          client_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          schedule_id: string
          title: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          client_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          schedule_id: string
          title: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          schedule_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_notifications_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          materials_used: Json | null
          schedule_id: string
          session_duration: number | null
          session_notes: string | null
          session_number: number
          total_materials_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          materials_used?: Json | null
          schedule_id: string
          session_duration?: number | null
          session_notes?: string | null
          session_number?: number
          total_materials_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          materials_used?: Json | null
          schedule_id?: string
          session_duration?: number | null
          session_notes?: string | null
          session_number?: number
          total_materials_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_reports: {
        Row: {
          amount_charged: number | null
          attachments: Json | null
          attendance_type: string
          client_id: string
          completed_by: string | null
          completed_by_name: string | null
          created_at: string
          created_by: string
          employee_id: string
          end_time: string
          id: string
          institution_amount: number | null
          materials_used: Json | null
          next_session_plan: string | null
          observations: string | null
          patient_name: string
          patient_response: string | null
          professional_amount: number | null
          professional_name: string
          rejection_reason: string | null
          schedule_id: string | null
          session_duration: number | null
          session_notes: string | null
          start_time: string
          status: string
          techniques_used: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validated_by_name: string | null
          validation_status: string | null
        }
        Insert: {
          amount_charged?: number | null
          attachments?: Json | null
          attendance_type?: string
          client_id: string
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          created_by: string
          employee_id: string
          end_time: string
          id?: string
          institution_amount?: number | null
          materials_used?: Json | null
          next_session_plan?: string | null
          observations?: string | null
          patient_name: string
          patient_response?: string | null
          professional_amount?: number | null
          professional_name: string
          rejection_reason?: string | null
          schedule_id?: string | null
          session_duration?: number | null
          session_notes?: string | null
          start_time: string
          status?: string
          techniques_used?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_by_name?: string | null
          validation_status?: string | null
        }
        Update: {
          amount_charged?: number | null
          attachments?: Json | null
          attendance_type?: string
          client_id?: string
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          created_by?: string
          employee_id?: string
          end_time?: string
          id?: string
          institution_amount?: number | null
          materials_used?: Json | null
          next_session_plan?: string | null
          observations?: string | null
          patient_name?: string
          patient_response?: string | null
          professional_amount?: number | null
          professional_name?: string
          rejection_reason?: string | null
          schedule_id?: string | null
          session_duration?: number | null
          session_notes?: string | null
          start_time?: string
          status?: string
          techniques_used?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_by_name?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_reports_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automatic_financial_records: {
        Row: {
          amount: number
          attendance_report_id: string | null
          completed_by: string | null
          completed_by_name: string | null
          created_at: string
          created_by: string
          created_by_name: string
          description: string
          id: string
          metadata: Json | null
          origin_id: string | null
          origin_type: string
          patient_id: string
          patient_name: string
          payment_date: string
          payment_method: string
          professional_id: string | null
          professional_name: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          attendance_report_id?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          created_by: string
          created_by_name: string
          description: string
          id?: string
          metadata?: Json | null
          origin_id?: string | null
          origin_type: string
          patient_id: string
          patient_name: string
          payment_date?: string
          payment_method: string
          professional_id?: string | null
          professional_name?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attendance_report_id?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          created_by?: string
          created_by_name?: string
          description?: string
          id?: string
          metadata?: Json | null
          origin_id?: string | null
          origin_type?: string
          patient_id?: string
          patient_name?: string
          payment_date?: string
          payment_method?: string
          professional_id?: string | null
          professional_name?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automatic_financial_records_attendance_report_id_fkey"
            columns: ["attendance_report_id"]
            isOneToOne: false
            referencedRelation: "attendance_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automatic_financial_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_members: {
        Row: {
          channel_id: string | null
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string | null
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      client_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          client_id: string | null
          employee_id: string | null
          id: string
          is_active: boolean | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          client_id?: string | null
          employee_id?: string | null
          id?: string
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "client_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string | null
          document_name: string
          document_type: string | null
          file_path: string | null
          file_size: number | null
          id: string
          is_active: boolean | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id?: string | null
          document_name: string
          document_type?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string | null
          document_name?: string
          document_type?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          is_active?: boolean | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_feedback_control: {
        Row: {
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          deadline_date: string
          id: string
          laudo_file_path: string | null
          notes: string | null
          report_attached: boolean | null
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          deadline_date: string
          id?: string
          laudo_file_path?: string | null
          notes?: string | null
          report_attached?: boolean | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          deadline_date?: string
          id?: string
          laudo_file_path?: string | null
          notes?: string | null
          report_attached?: boolean | null
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_feedback_control_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_private: boolean | null
          note_text: string
          note_type: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_private?: boolean | null
          note_text: string
          note_type?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_private?: boolean | null
          note_text?: string
          note_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount_paid: number | null
          amount_remaining: number
          client_id: string
          created_at: string
          created_by: string
          credit_card_installments: number | null
          description: string | null
          down_payment_amount: number | null
          down_payment_method: string | null
          due_date: string | null
          id: string
          installments_paid: number | null
          installments_total: number | null
          notes: string | null
          payment_combination: Json | null
          payment_method: string | null
          payment_type: string
          status: string
          total_amount: number
          unit: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          amount_remaining: number
          client_id: string
          created_at?: string
          created_by: string
          credit_card_installments?: number | null
          description?: string | null
          down_payment_amount?: number | null
          down_payment_method?: string | null
          due_date?: string | null
          id?: string
          installments_paid?: number | null
          installments_total?: number | null
          notes?: string | null
          payment_combination?: Json | null
          payment_method?: string | null
          payment_type: string
          status?: string
          total_amount: number
          unit?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          amount_remaining?: number
          client_id?: string
          created_at?: string
          created_by?: string
          credit_card_installments?: number | null
          description?: string | null
          down_payment_amount?: number | null
          down_payment_method?: string | null
          due_date?: string | null
          id?: string
          installments_paid?: number | null
          installments_total?: number | null
          notes?: string | null
          payment_combination?: Json | null
          payment_method?: string | null
          payment_type?: string
          status?: string
          total_amount?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          birth_date: string | null
          clinical_observations: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          current_medications: Json | null
          current_symptoms: string | null
          diagnosis: string | null
          email: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          last_session_date: string | null
          last_session_notes: string | null
          last_session_type: string | null
          medical_history: string | null
          name: string
          neuro_completed_date: string | null
          neuro_diagnosis_by: string | null
          neuro_diagnosis_suggestion: string | null
          neuro_diagnostic_agreement: string | null
          neuro_divergence_type: string | null
          neuro_final_diagnosis: string | null
          neuro_observations: string | null
          neuro_patient_code: string | null
          neuro_relevant_history: string | null
          neuro_report_deadline: string | null
          neuro_report_file_path: string | null
          neuro_socioeconomic: string | null
          neuro_test_start_date: string | null
          neuro_tests_applied: Json | null
          neuropsych_complaint: string | null
          notes: string | null
          phone: string | null
          responsible_cpf: string | null
          responsible_name: string | null
          responsible_phone: string | null
          rg: string | null
          treatment_expectations: string | null
          treatment_progress: string | null
          unit: string | null
          updated_at: string
          vital_signs_history: Json | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          clinical_observations?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          current_medications?: Json | null
          current_symptoms?: string | null
          diagnosis?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_session_date?: string | null
          last_session_notes?: string | null
          last_session_type?: string | null
          medical_history?: string | null
          name: string
          neuro_completed_date?: string | null
          neuro_diagnosis_by?: string | null
          neuro_diagnosis_suggestion?: string | null
          neuro_diagnostic_agreement?: string | null
          neuro_divergence_type?: string | null
          neuro_final_diagnosis?: string | null
          neuro_observations?: string | null
          neuro_patient_code?: string | null
          neuro_relevant_history?: string | null
          neuro_report_deadline?: string | null
          neuro_report_file_path?: string | null
          neuro_socioeconomic?: string | null
          neuro_test_start_date?: string | null
          neuro_tests_applied?: Json | null
          neuropsych_complaint?: string | null
          notes?: string | null
          phone?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          rg?: string | null
          treatment_expectations?: string | null
          treatment_progress?: string | null
          unit?: string | null
          updated_at?: string
          vital_signs_history?: Json | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          clinical_observations?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          current_medications?: Json | null
          current_symptoms?: string | null
          diagnosis?: string | null
          email?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          last_session_date?: string | null
          last_session_notes?: string | null
          last_session_type?: string | null
          medical_history?: string | null
          name?: string
          neuro_completed_date?: string | null
          neuro_diagnosis_by?: string | null
          neuro_diagnosis_suggestion?: string | null
          neuro_diagnostic_agreement?: string | null
          neuro_divergence_type?: string | null
          neuro_final_diagnosis?: string | null
          neuro_observations?: string | null
          neuro_patient_code?: string | null
          neuro_relevant_history?: string | null
          neuro_report_deadline?: string | null
          neuro_report_file_path?: string | null
          neuro_socioeconomic?: string | null
          neuro_test_start_date?: string | null
          neuro_tests_applied?: Json | null
          neuropsych_complaint?: string | null
          notes?: string | null
          phone?: string | null
          responsible_cpf?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          rg?: string | null
          treatment_expectations?: string | null
          treatment_progress?: string | null
          unit?: string | null
          updated_at?: string
          vital_signs_history?: Json | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      custom_job_positions: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_reports: {
        Row: {
          attachments: Json | null
          client_id: string | null
          completed_by: string | null
          completed_by_name: string | null
          created_at: string
          effort_rating: number | null
          employee_id: string
          follow_up_needed: boolean | null
          goal_achievement: number | null
          id: string
          materials_cost: number | null
          materials_used: Json | null
          next_session_plan: string | null
          patient_cooperation: number | null
          patient_response: string | null
          professional_notes: string | null
          quality_rating: number | null
          rejection_reason: string | null
          schedule_id: string | null
          session_date: string
          session_duration: number | null
          session_location: string | null
          session_objectives: string | null
          session_type: string
          supervision_required: boolean | null
          techniques_used: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validated_by_name: string | null
          validation_status: string | null
        }
        Insert: {
          attachments?: Json | null
          client_id?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          effort_rating?: number | null
          employee_id: string
          follow_up_needed?: boolean | null
          goal_achievement?: number | null
          id?: string
          materials_cost?: number | null
          materials_used?: Json | null
          next_session_plan?: string | null
          patient_cooperation?: number | null
          patient_response?: string | null
          professional_notes?: string | null
          quality_rating?: number | null
          rejection_reason?: string | null
          schedule_id?: string | null
          session_date?: string
          session_duration?: number | null
          session_location?: string | null
          session_objectives?: string | null
          session_type: string
          supervision_required?: boolean | null
          techniques_used?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_by_name?: string | null
          validation_status?: string | null
        }
        Update: {
          attachments?: Json | null
          client_id?: string | null
          completed_by?: string | null
          completed_by_name?: string | null
          created_at?: string
          effort_rating?: number | null
          employee_id?: string
          follow_up_needed?: boolean | null
          goal_achievement?: number | null
          id?: string
          materials_cost?: number | null
          materials_used?: Json | null
          next_session_plan?: string | null
          patient_cooperation?: number | null
          patient_response?: string | null
          professional_notes?: string | null
          quality_rating?: number | null
          rejection_reason?: string | null
          schedule_id?: string | null
          session_date?: string
          session_duration?: number | null
          session_location?: string | null
          session_objectives?: string | null
          session_type?: string
          supervision_required?: boolean | null
          techniques_used?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validated_by_name?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "employee_reports_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_timesheet: {
        Row: {
          approved_by: string | null
          break_end: string | null
          break_start: string | null
          clock_in: string | null
          clock_out: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: string | null
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          break_end?: string | null
          break_start?: string | null
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          emergency_contact: string | null
          emergency_phone: string | null
          employee_code: string | null
          id: string
          notes: string | null
          professional_license: string | null
          profile_id: string
          specialization: string | null
          updated_at: string
          user_id: string
          work_schedule: Json | null
        }
        Insert: {
          created_at?: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_code?: string | null
          id?: string
          notes?: string | null
          professional_license?: string | null
          profile_id: string
          specialization?: string | null
          updated_at?: string
          user_id: string
          work_schedule?: Json | null
        }
        Update: {
          created_at?: string
          emergency_contact?: string | null
          emergency_phone?: string | null
          employee_code?: string | null
          id?: string
          notes?: string | null
          professional_license?: string | null
          profile_id?: string
          specialization?: string | null
          updated_at?: string
          user_id?: string
          work_schedule?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      file_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          file_id: string
          id: string
          permission_level: string | null
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_id: string
          id?: string
          permission_level?: string | null
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_id?: string
          id?: string
          permission_level?: string | null
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "user_files"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_log: {
        Row: {
          action: string
          change_reason: string | null
          changed_by: string
          changed_by_name: string
          created_at: string
          financial_record_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          change_reason?: string | null
          changed_by: string
          changed_by_name: string
          created_at?: string
          financial_record_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          change_reason?: string | null
          changed_by?: string
          changed_by_name?: string
          created_at?: string
          financial_record_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_audit_log_financial_record_id_fkey"
            columns: ["financial_record_id"]
            isOneToOne: false
            referencedRelation: "automatic_financial_records"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          note_date: string
          note_text: string
          note_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_date?: string
          note_text: string
          note_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          note_date?: string
          note_text?: string
          note_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      financial_records: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          employee_id: string | null
          id: string
          invoice_number: string | null
          is_recurring: boolean | null
          notes: string | null
          payment_combination: Json | null
          payment_method: string | null
          recurring_frequency: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          employee_id?: string | null
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          payment_combination?: Json | null
          payment_method?: string | null
          recurring_frequency?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          employee_id?: string | null
          id?: string
          invoice_number?: string | null
          is_recurring?: boolean | null
          notes?: string | null
          payment_combination?: Json | null
          payment_method?: string | null
          recurring_frequency?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          attachments: Json | null
          channel_id: string | null
          created_at: string
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          message_body: string
          message_type: string | null
          parent_message_id: string | null
          priority: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          subject: string
          thread_id: string | null
        }
        Insert: {
          attachments?: Json | null
          channel_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message_body: string
          message_type?: string | null
          parent_message_id?: string | null
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          subject: string
          thread_id?: string | null
        }
        Update: {
          attachments?: Json | null
          channel_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          message_body?: string
          message_type?: string | null
          parent_message_id?: string | null
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          subject?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "internal_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "internal_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          attachments: Json | null
          client_id: string
          created_at: string
          employee_id: string
          id: string
          medications: Json | null
          next_appointment_notes: string | null
          progress_notes: string
          session_date: string
          session_duration: number | null
          session_type: string
          status: string | null
          symptoms: string | null
          treatment_plan: string | null
          updated_at: string
          vital_signs: Json | null
        }
        Insert: {
          attachments?: Json | null
          client_id: string
          created_at?: string
          employee_id: string
          id?: string
          medications?: Json | null
          next_appointment_notes?: string | null
          progress_notes: string
          session_date: string
          session_duration?: number | null
          session_type: string
          status?: string | null
          symptoms?: string | null
          treatment_plan?: string | null
          updated_at?: string
          vital_signs?: Json | null
        }
        Update: {
          attachments?: Json | null
          client_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          medications?: Json | null
          next_appointment_notes?: string | null
          progress_notes?: string
          session_date?: string
          session_duration?: number | null
          session_type?: string
          status?: string | null
          symptoms?: string | null
          treatment_plan?: string | null
          updated_at?: string
          vital_signs?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_alerts: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          is_open_enrollment: boolean | null
          max_participants: number | null
          meeting_date: string
          meeting_location: string | null
          meeting_room: string | null
          message: string
          participants: string[] | null
          status: string
          title: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          is_open_enrollment?: boolean | null
          max_participants?: number | null
          meeting_date: string
          meeting_location?: string | null
          meeting_room?: string | null
          message: string
          participants?: string[] | null
          status?: string
          title: string
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          is_open_enrollment?: boolean | null
          max_participants?: number | null
          meeting_date?: string
          meeting_location?: string | null
          meeting_room?: string | null
          message?: string
          participants?: string[] | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          order_index: number
          role_required: Database["public"]["Enums"]["employee_role"] | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          is_active?: boolean
          order_index?: number
          role_required?: Database["public"]["Enums"]["employee_role"] | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          order_index?: number
          role_required?: Database["public"]["Enums"]["employee_role"] | null
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          category: string | null
          client_id: string | null
          content: string | null
          created_at: string
          created_by: string | null
          employee_id: string | null
          id: string
          is_private: boolean | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          is_private?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          id?: string
          is_private?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_global: boolean | null
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_global?: boolean | null
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_global?: boolean | null
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_installments: {
        Row: {
          amount: number
          client_payment_id: string
          created_at: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          paid_amount: number | null
          paid_by: string | null
          paid_date: string | null
          payment_method: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_payment_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          paid_amount?: number | null
          paid_by?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_payment_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          paid_amount?: number | null
          paid_by?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_client_payment_id_fkey"
            columns: ["client_payment_id"]
            isOneToOne: false
            referencedRelation: "client_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          new_value: Json | null
          old_value: Json | null
          permission: Database["public"]["Enums"]["permission_action"] | null
          position_id: string | null
          reason: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          permission?: Database["public"]["Enums"]["permission_action"] | null
          position_id?: string | null
          reason?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          old_value?: Json | null
          permission?: Database["public"]["Enums"]["permission_action"] | null
          position_id?: string | null
          reason?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_log_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "custom_job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      position_permissions: {
        Row: {
          conditions: Json | null
          created_at: string | null
          granted: boolean | null
          id: string
          permission: Database["public"]["Enums"]["permission_action"]
          position_id: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission: Database["public"]["Enums"]["permission_action"]
          position_id?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission?: Database["public"]["Enums"]["permission_action"]
          position_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "position_permissions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "custom_job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          client_id: string
          created_at: string
          diagnosis: string | null
          employee_id: string
          follow_up_notes: string | null
          general_instructions: string | null
          id: string
          medications: Json | null
          prescription_date: string
          schedule_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          diagnosis?: string | null
          employee_id: string
          follow_up_notes?: string | null
          general_instructions?: string | null
          id?: string
          medications?: Json | null
          prescription_date?: string
          schedule_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          diagnosis?: string | null
          employee_id?: string
          follow_up_notes?: string | null
          general_instructions?: string | null
          id?: string
          medications?: Json | null
          prescription_date?: string
          schedule_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          department: string | null
          document_cpf: string | null
          document_rg: string | null
          email: string | null
          employee_role: Database["public"]["Enums"]["employee_role"] | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          must_change_password: boolean | null
          name: string | null
          permissions: Json | null
          phone: string | null
          salary: number | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          department?: string | null
          document_cpf?: string | null
          document_rg?: string | null
          email?: string | null
          employee_role?: Database["public"]["Enums"]["employee_role"] | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          name?: string | null
          permissions?: Json | null
          phone?: string | null
          salary?: number | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          department?: string | null
          document_cpf?: string | null
          document_rg?: string | null
          email?: string | null
          employee_role?: Database["public"]["Enums"]["employee_role"] | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          must_change_password?: boolean | null
          name?: string | null
          permissions?: Json | null
          phone?: string | null
          salary?: number | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quality_evaluations: {
        Row: {
          client_id: string
          comments: string | null
          communication_score: number | null
          created_at: string
          employee_id: string
          evaluation_date: string
          evaluator_id: string
          follow_up_required: boolean | null
          id: string
          improvement_suggestions: string | null
          overall_satisfaction: number | null
          professionalism_score: number | null
          punctuality_score: number | null
          service_quality_score: number | null
        }
        Insert: {
          client_id: string
          comments?: string | null
          communication_score?: number | null
          created_at?: string
          employee_id: string
          evaluation_date?: string
          evaluator_id: string
          follow_up_required?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          overall_satisfaction?: number | null
          professionalism_score?: number | null
          punctuality_score?: number | null
          service_quality_score?: number | null
        }
        Update: {
          client_id?: string
          comments?: string | null
          communication_score?: number | null
          created_at?: string
          employee_id?: string
          evaluation_date?: string
          evaluator_id?: string
          follow_up_required?: boolean | null
          id?: string
          improvement_suggestions?: string | null
          overall_satisfaction?: number | null
          professionalism_score?: number | null
          punctuality_score?: number | null
          service_quality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quality_evaluations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      role_module_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          module_name: Database["public"]["Enums"]["system_module"]
          permission_scope: Database["public"]["Enums"]["permission_scope"]
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          module_name: Database["public"]["Enums"]["system_module"]
          permission_scope: Database["public"]["Enums"]["permission_scope"]
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          module_name?: Database["public"]["Enums"]["system_module"]
          permission_scope?: Database["public"]["Enums"]["permission_scope"]
          role_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          employee_role: Database["public"]["Enums"]["employee_role"]
          granted: boolean
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_role: Database["public"]["Enums"]["employee_role"]
          granted?: boolean
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_role?: Database["public"]["Enums"]["employee_role"]
          granted?: boolean
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          anamnesis_type_id: string | null
          arrived_at: string | null
          arrived_confirmed_by: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string | null
          end_time: string
          id: string
          location: string | null
          materials_used: Json | null
          notes: string | null
          patient_arrived: boolean | null
          payment_method: string | null
          session_amount: number | null
          session_notes: string | null
          start_time: string
          status: string | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          anamnesis_type_id?: string | null
          arrived_at?: string | null
          arrived_confirmed_by?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          end_time: string
          id?: string
          location?: string | null
          materials_used?: Json | null
          notes?: string | null
          patient_arrived?: boolean | null
          payment_method?: string | null
          session_amount?: number | null
          session_notes?: string | null
          start_time: string
          status?: string | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          anamnesis_type_id?: string | null
          arrived_at?: string | null
          arrived_confirmed_by?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string | null
          end_time?: string
          id?: string
          location?: string | null
          materials_used?: Json | null
          notes?: string | null
          patient_arrived?: boolean | null
          payment_method?: string | null
          session_amount?: number | null
          session_notes?: string | null
          start_time?: string
          status?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_anamnesis_type_id_fkey"
            columns: ["anamnesis_type_id"]
            isOneToOne: false
            referencedRelation: "anamnesis_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stock_item_attachments: {
        Row: {
          document_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          notes: string | null
          stock_item_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          document_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          stock_item_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          notes?: string | null
          stock_item_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_item_attachments_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          created_by: string | null
          current_quantity: number | null
          description: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          location: string | null
          minimum_quantity: number | null
          name: string
          supplier: string | null
          total_expense: number | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_quantity?: number | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          minimum_quantity?: number | null
          name: string
          supplier?: string | null
          total_expense?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          current_quantity?: number | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          minimum_quantity?: number | null
          name?: string
          supplier?: string | null
          total_expense?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          attendance_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          date: string
          from_location: string | null
          id: string
          moved_by: string | null
          new_quantity: number | null
          notes: string | null
          previous_quantity: number | null
          quantity: number
          reason: string | null
          reference_document: string | null
          schedule_id: string | null
          session_number: number | null
          stock_item_id: string
          to_location: string | null
          total_cost: number | null
          type: string
          unit_cost: number | null
          updated_at: string | null
        }
        Insert: {
          attendance_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          from_location?: string | null
          id?: string
          moved_by?: string | null
          new_quantity?: number | null
          notes?: string | null
          previous_quantity?: number | null
          quantity: number
          reason?: string | null
          reference_document?: string | null
          schedule_id?: string | null
          session_number?: number | null
          stock_item_id: string
          to_location?: string | null
          total_cost?: number | null
          type: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          attendance_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          from_location?: string | null
          id?: string
          moved_by?: string | null
          new_quantity?: number | null
          notes?: string | null
          previous_quantity?: number | null
          quantity?: number
          reason?: string | null
          reference_document?: string | null
          schedule_id?: string | null
          session_number?: number | null
          stock_item_id?: string
          to_location?: string | null
          total_cost?: number | null
          type?: string
          unit_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_movements_client"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stock_movements_schedule"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          is_public: boolean | null
          setting_key: string
          setting_type: string | null
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key: string
          setting_type?: string | null
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_public?: boolean | null
          setting_key?: string
          setting_type?: string | null
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_files: {
        Row: {
          category: string | null
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_private: boolean | null
          mime_type: string | null
          tags: string[] | null
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_private?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_private?: boolean | null
          mime_type?: string | null
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_job_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          position_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          position_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          position_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_job_assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "custom_job_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission_key: string
          permission_value: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_key: string
          permission_value?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_key?: string
          permission_value?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean | null
          last_seen: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          is_online?: boolean | null
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          is_online?: boolean | null
          last_seen?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity: string
          login_at: string
          logout_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          login_at?: string
          logout_at?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity?: string
          login_at?: string
          logout_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_specific_permissions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted: boolean
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["permission_action"]
          reason: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted: boolean
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["permission_action"]
          reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted?: boolean
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["permission_action"]
          reason?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_feedback_deadline: {
        Args: { start_date: string }
        Returns: string
      }
      can_access_financial: { Args: never; Returns: boolean }
      can_access_reports: { Args: never; Returns: boolean }
      can_configure_reports: { Args: never; Returns: boolean }
      can_manage_employees: { Args: never; Returns: boolean }
      can_manage_stock: { Args: never; Returns: boolean }
      can_view_all_clients: { Args: never; Returns: boolean }
      create_appointment_notification: {
        Args: {
          p_appointment_date: string
          p_appointment_time: string
          p_client_id: string
          p_employee_id: string
          p_schedule_id: string
          p_service_type?: string
        }
        Returns: string
      }
      create_director_user: { Args: never; Returns: Json }
      create_payment_installments: {
        Args: {
          p_client_payment_id: string
          p_first_due_date: string
          p_installments_total: number
          p_total_amount: number
        }
        Returns: boolean
      }
      create_test_employee: {
        Args: {
          p_department?: string
          p_email: string
          p_name: string
          p_password: string
          p_phone?: string
          p_role: Database["public"]["Enums"]["employee_role"]
        }
        Returns: string
      }
      debug_my_permissions: {
        Args: never
        Returns: {
          can_access_reports: boolean
          can_configure_reports: boolean
          is_active: boolean
          is_coordinator: boolean
          is_director: boolean
          is_manager: boolean
          my_role: Database["public"]["Enums"]["employee_role"]
          my_user_id: string
        }[]
      }
      debug_user_permissions: {
        Args: never
        Returns: {
          can_access_reports: boolean
          employee_role: Database["public"]["Enums"]["employee_role"]
          is_active: boolean
          profile_exists: boolean
          user_id: string
        }[]
      }
      director_has_god_mode: { Args: never; Returns: boolean }
      get_accessible_employee_details: {
        Args: never
        Returns: {
          address: string
          birth_date: string
          created_at: string
          department: string
          document_cpf: string
          document_rg: string
          emergency_contact: string
          emergency_phone: string
          employee_code: string
          employee_notes: string
          employee_role: Database["public"]["Enums"]["employee_role"]
          hire_date: string
          is_active: boolean
          name: string
          permissions: Json
          phone: string
          professional_license: string
          profile_id: string
          salary: number
          specialization: string
          updated_at: string
          user_id: string
          work_schedule: Json
        }[]
      }
      get_client_name: { Args: { client_uuid: string }; Returns: string }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["employee_role"]
      }
      get_employee_name: { Args: { employee_uuid: string }; Returns: string }
      get_secure_employee_details: {
        Args: never
        Returns: {
          address: string
          birth_date: string
          created_at: string
          department: string
          document_cpf: string
          document_rg: string
          emergency_contact: string
          emergency_phone: string
          employee_code: string
          employee_notes: string
          employee_role: Database["public"]["Enums"]["employee_role"]
          hire_date: string
          is_active: boolean
          name: string
          permissions: Json
          phone: string
          professional_license: string
          profile_id: string
          salary: number
          specialization: string
          updated_at: string
          user_id: string
          work_schedule: Json
        }[]
      }
      get_stock_movements_with_details: {
        Args: never
        Returns: {
          attendance_id: string
          client_id: string
          client_name: string
          created_at: string
          date: string
          from_location: string
          id: string
          item_name: string
          moved_by: string
          moved_by_name: string
          movement_type: string
          new_quantity: number
          notes: string
          previous_quantity: number
          quantity: number
          reason: string
          schedule_id: string
          stock_item_id: string
          to_location: string
          total_cost: number
          unit_cost: number
        }[]
      }
      get_user_permissions:
        | {
            Args: never
            Returns: {
              permission: Database["public"]["Enums"]["permission_type"]
            }[]
          }
        | {
            Args: { user_uuid?: string }
            Returns: {
              granted: boolean
              permission: Database["public"]["Enums"]["permission_action"]
              source: string
            }[]
          }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["employee_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coordinator: { Args: never; Returns: boolean }
      is_director: { Args: never; Returns: boolean }
      is_god_mode_director: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_receptionist: { Args: never; Returns: boolean }
      log_sensitive_access: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
      manage_user_session: {
        Args: {
          p_session_token: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: undefined
      }
      mark_notification_as_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      process_attendance_validation: {
        Args: { p_attendance_record: Record<string, unknown> }
        Returns: boolean
      }
      user_has_any_role: {
        Args: { allowed_roles: Database["public"]["Enums"]["employee_role"][] }
        Returns: boolean
      }
      user_has_permission:
        | {
            Args: {
              required_permission: Database["public"]["Enums"]["permission_type"]
            }
            Returns: boolean
          }
        | {
            Args: {
              required_permission: Database["public"]["Enums"]["permission_action"]
              user_uuid: string
            }
            Returns: boolean
          }
      user_has_role: {
        Args: { allowed_roles: Database["public"]["Enums"]["employee_role"][] }
        Returns: boolean
      }
      validate_attendance_report:
        | {
            Args: {
              p_action: string
              p_attendance_report_id: string
              p_rejection_reason?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_action: string
              p_attendance_report_id: string
              p_foundation_amount?: number
              p_professional_amount?: number
              p_rejection_reason?: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_action: string
              p_attendance_report_id: string
              p_foundation_amount?: number
              p_professional_amount?: number
              p_rejection_reason?: string
              p_total_amount?: number
            }
            Returns: boolean
          }
        | {
            Args: {
              p_action: string
              p_attendance_report_id: string
              p_foundation_amount?: number
              p_payment_method?: string
              p_professional_amount?: number
              p_rejection_reason?: string
              p_total_amount?: number
            }
            Returns: boolean
          }
    }
    Enums: {
      app_role:
        | "director"
        | "coordinator_madre"
        | "coordinator_floresta"
        | "psychologist"
        | "psychopedagogue"
        | "speech_therapist"
        | "nutritionist"
        | "terapeuta_ocupacional"
        | "receptionist"
        | "intern"
        | "financeiro"
      employee_role:
        | "director"
        | "coordinator_madre"
        | "coordinator_floresta"
        | "staff"
        | "intern"
        | "musictherapist"
        | "financeiro"
        | "receptionist"
        | "psychologist"
        | "psychopedagogue"
        | "speech_therapist"
        | "nutritionist"
        | "physiotherapist"
        | "terapeuta_ocupacional"
        | "advogada"
        | "coordinator_atendimento_floresta"
        | "terapeuta_ocupacional_integracao"
        | "psiquiatra"
        | "neuropediatra"
      permission_action:
        | "view_dashboard"
        | "view_clients"
        | "view_schedules"
        | "view_financial"
        | "view_reports"
        | "view_stock"
        | "view_employees"
        | "view_medical_records"
        | "view_contracts"
        | "view_messages"
        | "view_files"
        | "view_quality_control"
        | "view_timesheet"
        | "view_meeting_alerts"
        | "create_clients"
        | "create_schedules"
        | "create_financial_records"
        | "create_stock_items"
        | "create_employees"
        | "create_medical_records"
        | "create_contracts"
        | "create_messages"
        | "create_files"
        | "create_quality_evaluations"
        | "create_meeting_alerts"
        | "edit_clients"
        | "edit_schedules"
        | "edit_financial_records"
        | "edit_stock_items"
        | "edit_employees"
        | "edit_medical_records"
        | "edit_contracts"
        | "edit_files"
        | "edit_system_settings"
        | "edit_user_permissions"
        | "delete_clients"
        | "delete_schedules"
        | "delete_financial_records"
        | "delete_stock_items"
        | "delete_employees"
        | "delete_medical_records"
        | "delete_contracts"
        | "delete_files"
        | "manage_users"
        | "manage_roles"
        | "change_user_passwords"
        | "view_audit_logs"
        | "manage_system_settings"
        | "export_data"
        | "import_data"
        | "view_sensitive_data"
        | "confirm_appointments"
        | "cancel_appointments"
        | "approve_timesheet"
        | "assign_clients"
        | "generate_reports"
        | "access_all_units"
      permission_scope: "view" | "create" | "edit" | "delete"
      permission_type:
        | "view_clients"
        | "create_clients"
        | "edit_clients"
        | "delete_clients"
        | "view_employees"
        | "create_employees"
        | "edit_employees"
        | "delete_employees"
        | "view_financial"
        | "create_financial"
        | "edit_financial"
        | "delete_financial"
        | "view_schedules"
        | "create_schedules"
        | "edit_schedules"
        | "delete_schedules"
        | "view_stock"
        | "create_stock"
        | "edit_stock"
        | "delete_stock"
        | "view_reports"
        | "create_reports"
        | "edit_reports"
        | "delete_reports"
        | "view_documents"
        | "create_documents"
        | "edit_documents"
        | "delete_documents"
        | "manage_roles"
        | "manage_permissions"
        | "view_audit_logs"
        | "system_admin"
      system_module:
        | "attendance"
        | "reports"
        | "financial"
        | "clients"
        | "users"
        | "settings"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "director",
        "coordinator_madre",
        "coordinator_floresta",
        "psychologist",
        "psychopedagogue",
        "speech_therapist",
        "nutritionist",
        "terapeuta_ocupacional",
        "receptionist",
        "intern",
        "financeiro",
      ],
      employee_role: [
        "director",
        "coordinator_madre",
        "coordinator_floresta",
        "staff",
        "intern",
        "musictherapist",
        "financeiro",
        "receptionist",
        "psychologist",
        "psychopedagogue",
        "speech_therapist",
        "nutritionist",
        "physiotherapist",
        "terapeuta_ocupacional",
        "advogada",
        "coordinator_atendimento_floresta",
        "terapeuta_ocupacional_integracao",
        "psiquiatra",
        "neuropediatra",
      ],
      permission_action: [
        "view_dashboard",
        "view_clients",
        "view_schedules",
        "view_financial",
        "view_reports",
        "view_stock",
        "view_employees",
        "view_medical_records",
        "view_contracts",
        "view_messages",
        "view_files",
        "view_quality_control",
        "view_timesheet",
        "view_meeting_alerts",
        "create_clients",
        "create_schedules",
        "create_financial_records",
        "create_stock_items",
        "create_employees",
        "create_medical_records",
        "create_contracts",
        "create_messages",
        "create_files",
        "create_quality_evaluations",
        "create_meeting_alerts",
        "edit_clients",
        "edit_schedules",
        "edit_financial_records",
        "edit_stock_items",
        "edit_employees",
        "edit_medical_records",
        "edit_contracts",
        "edit_files",
        "edit_system_settings",
        "edit_user_permissions",
        "delete_clients",
        "delete_schedules",
        "delete_financial_records",
        "delete_stock_items",
        "delete_employees",
        "delete_medical_records",
        "delete_contracts",
        "delete_files",
        "manage_users",
        "manage_roles",
        "change_user_passwords",
        "view_audit_logs",
        "manage_system_settings",
        "export_data",
        "import_data",
        "view_sensitive_data",
        "confirm_appointments",
        "cancel_appointments",
        "approve_timesheet",
        "assign_clients",
        "generate_reports",
        "access_all_units",
      ],
      permission_scope: ["view", "create", "edit", "delete"],
      permission_type: [
        "view_clients",
        "create_clients",
        "edit_clients",
        "delete_clients",
        "view_employees",
        "create_employees",
        "edit_employees",
        "delete_employees",
        "view_financial",
        "create_financial",
        "edit_financial",
        "delete_financial",
        "view_schedules",
        "create_schedules",
        "edit_schedules",
        "delete_schedules",
        "view_stock",
        "create_stock",
        "edit_stock",
        "delete_stock",
        "view_reports",
        "create_reports",
        "edit_reports",
        "delete_reports",
        "view_documents",
        "create_documents",
        "edit_documents",
        "delete_documents",
        "manage_roles",
        "manage_permissions",
        "view_audit_logs",
        "system_admin",
      ],
      system_module: [
        "attendance",
        "reports",
        "financial",
        "clients",
        "users",
        "settings",
      ],
    },
  },
} as const

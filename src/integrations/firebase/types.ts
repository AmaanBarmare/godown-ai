export interface EmailMapping {
  id: string;
  company: string;
  sender_email: string;
  primary_email: string;
  cc: string;
  bcc: string;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  company_name: string;
  signing_authority: string;
  gst_number: string;
  registered_address: string;
  warehouse_location: string;
  area_sqft: number;
  rate_per_sqft: number;
  monthly_base_rent: number;
  possession_date: string;
  annual_increment: number;
  next_increment_date: string;
  invoice_send_day: number;
  rent_due_day: number;
  reminder_buffer_days: number;
  created_at?: string;
  updated_at?: string;
}

export interface Member {
  id: string;
  member_type: "company" | "individual";
  name: string;
  address: string;
  gst_number: string;
  bank_name: string;
  branch: string;
  ifsc_code: string;
  account_number: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id: string;
  company: string;
  amount: string;
  invoice_date: string;
  recipient_email: string;
  sender_email: string;
  cc: string;
  bcc: string;
  file_name: string;
  status: "Sent" | "Pending" | "Paid" | "Failed";
  invoice_number: string;
  invoice_period: string;
  member_id: string;
  base_amount: number;
  gst_type: "IGST" | "CGST+SGST";
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  due_date: string;
  reminder_sent_at?: string;
  payment_received?: number;
  tds_amount?: number;
  receipt_date?: string;
  bank_received_into?: string;
  confirmed_at?: string;
  created_at: string;
}

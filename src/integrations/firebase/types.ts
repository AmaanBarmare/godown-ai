export interface EmailMapping {
  id: string;
  company: string;
  primary_email: string;
  cc: string;
  bcc: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  company: string;
  amount: string;
  invoice_date: string;
  recipient_email: string;
  cc: string;
  bcc: string;
  file_name: string;
  status: string;
  created_at: string;
}

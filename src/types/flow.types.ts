export interface EncryptionMetadata {
  encrypted_hash: string;
  plaintext_hash: string;
  iv: string;
  encryption_key: string;
  hmac_key: string;
}

export interface FlowDocument {
  file_name: string;
  media_id: string;
  cdn_url: string;
  encryption_metadata: EncryptionMetadata;
}

export interface FlowDataExchangePayload {
  data: {
    documents: FlowDocument[];
  };
  flow_token: string;
  screen: string;
  action: "data_exchange";
  version: string;
}

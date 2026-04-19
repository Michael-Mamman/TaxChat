export interface SendNotificationPayload {
  phone: string;
  template_name: string;
  template_params: Record<string, string>;
  type: string;
  scheduled_at?: Date;
}

export interface TemplateMessage {
  name: string;
  language: { code: string };
  components: TemplateComponent[];
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters: Array<{
    type: "text" | "image" | "document";
    text?: string;
  }>;
}

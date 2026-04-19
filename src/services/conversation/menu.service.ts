import whatsappService from "../whatsapp/whatsapp.service.js";
import type { MenuOption } from "../../types/conversation.types.js";
import { MAIN_MENU_OPTIONS } from "../../utils/constants.js";

class MenuService {
  getMainMenuOptions(): MenuOption[] {
    return MAIN_MENU_OPTIONS.map((opt) => ({
      id: opt.id,
      title: opt.title,
      description: opt.description,
    }));
  }

  async sendMainMenu(phone: string): Promise<void> {
    const options = this.getMainMenuOptions();
    await whatsappService.sendMainMenu(phone, options);
  }

  async sendSubMenu(
    phone: string,
    headerText: string,
    bodyText: string,
    options: MenuOption[],
  ): Promise<void> {
    const rows = options.map((opt) => {
      const row: { id: string; title: string; description?: string } = {
        id: opt.id,
        title: opt.title.slice(0, 24),
      };
      if (opt.description) row.description = opt.description.slice(0, 72);
      return row;
    });

    await whatsappService.sendInteractiveListMessage(
      phone,
      headerText,
      bodyText,
      "NRS TaxChat",
      [{ title: "Options", rows }],
    );
  }

  async sendConfirmation(
    phone: string,
    bodyText: string,
    confirmId: string = "confirm_yes",
    cancelId: string = "confirm_no",
  ): Promise<void> {
    await whatsappService.sendInteractiveButtonMessage(phone, bodyText, [
      { id: confirmId, title: "Yes" },
      { id: cancelId, title: "No" },
    ]);
  }
}

export default new MenuService();

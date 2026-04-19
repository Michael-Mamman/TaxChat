import whatsappService from "../whatsapp/whatsapp.service.js";
import { MAIN_MENU_OPTIONS } from "../../utils/constants.js";
class MenuService {
    getMainMenuOptions() {
        return MAIN_MENU_OPTIONS.map((opt) => ({
            id: opt.id,
            title: opt.title,
            description: opt.description,
        }));
    }
    async sendMainMenu(phone) {
        const options = this.getMainMenuOptions();
        await whatsappService.sendMainMenu(phone, options);
    }
    async sendSubMenu(phone, headerText, bodyText, options) {
        const rows = options.map((opt) => {
            const row = {
                id: opt.id,
                title: opt.title.slice(0, 24),
            };
            if (opt.description)
                row.description = opt.description.slice(0, 72);
            return row;
        });
        await whatsappService.sendInteractiveListMessage(phone, headerText, bodyText, "NRS TaxChat", [{ title: "Options", rows }]);
    }
    async sendConfirmation(phone, bodyText, confirmId = "confirm_yes", cancelId = "confirm_no") {
        await whatsappService.sendInteractiveButtonMessage(phone, bodyText, [
            { id: confirmId, title: "Yes" },
            { id: cancelId, title: "No" },
        ]);
    }
}
export default new MenuService();

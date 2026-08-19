import whatsappService from "../whatsapp/whatsapp.service.js";
import { MAIN_MENU_OPTIONS } from "../../utils/constants.js";
import { WA, toRow } from "../whatsapp/whatsapp.limits.js";
class MenuService {
    getMainMenuOptions() {
        console.log("[menu.service::getMainMenuOptions] ENTER");
        const options = MAIN_MENU_OPTIONS.map((opt) => ({
            id: opt.id,
            title: opt.title,
            description: opt.description,
        }));
        console.log("[menu.service::getMainMenuOptions] EXIT", { count: options.length });
        return options;
    }
    async sendMainMenu(phone) {
        console.log("[menu.service::sendMainMenu] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null });
        const options = this.getMainMenuOptions();
        await whatsappService.sendMainMenu(phone, options);
        console.log("[menu.service::sendMainMenu] EXIT");
    }
    async sendSubMenu(phone, headerText, bodyText, options) {
        console.log("[menu.service::sendSubMenu] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, headerText, optionsCount: options?.length });
        const rows = options.slice(0, WA.LIST_ROWS_MAX).map(toRow);
        await whatsappService.sendInteractiveListMessage(phone, headerText, bodyText, "NRS TaxChat", [{ title: "Options", rows }]);
        console.log("[menu.service::sendSubMenu] EXIT");
    }
    async sendConfirmation(phone, bodyText, confirmId = "confirm_yes", cancelId = "confirm_no") {
        console.log("[menu.service::sendConfirmation] ENTER", { phone: phone ? `${phone.slice(0, 4)}***` : null, confirmId, cancelId });
        await whatsappService.sendInteractiveButtonMessage(phone, bodyText, [
            { id: confirmId, title: "Yes" },
            { id: cancelId, title: "No" },
        ]);
        console.log("[menu.service::sendConfirmation] EXIT");
    }
}
export default new MenuService();

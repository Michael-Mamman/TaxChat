import type { AdminJSOptions } from "adminjs";
import { componentLoader, Components } from "./component-loader.js";
import { dark, light, noSidebar } from "@adminjs/themes";
import resources from "./resources/index.js";
import { buildDashboardStats } from "./dashboard/stats.js";

console.log('[options::module] ENTER', { loading: true });

/** Accent sampled from the TaxChat mark. */
const BRAND_COLORS = {
  primary100: "#109040",
  primary80: "#2FA85C",
  primary60: "#5CBF80",
  primary40: "#98D8AE",
  primary20: "#D6EFDF",
};

/**
 * The dark theme pins its own primary100 (#256BEE), and a theme's own colours
 * beat `branding.theme` - so the accent has to be replaced in the theme too or
 * dark mode keeps the stock blue.
 */
const brandDark = {
  ...dark,
  overrides: {
    ...dark.overrides,
    colors: { ...(dark.overrides?.colors ?? {}), ...BRAND_COLORS },
  },
};

const options: AdminJSOptions = {
  resources,
  componentLoader,
  dashboard: {
    component: Components.Dashboard,
    handler: async () => buildDashboardStats(),
  },
  defaultTheme: brandDark.id,
  availableThemes: [brandDark, light, noSidebar],
  rootPath: "/admin",
  databases: [],
  branding: {
    companyName: "TaxChat",
    // Our own SidebarBranding/Login components render the logo, and these two
    // flags stop AdminJS injecting its logotype and "made with love" footer.
    logo: false,
    withMadeWithLove: false,
    favicon: "/public/brand/favicon.png",
    // AdminJS's stock indigo accent is a big part of its out-of-the-box look.
    theme: { colors: BRAND_COLORS },
  },
};

console.log('[options::module] EXIT', { resourceCount: options.resources?.length, rootPath: options.rootPath });

export default options;

import { ComponentLoader } from "adminjs";

console.log('[component-loader::module] ENTER', { loading: true });

const componentLoader = new ComponentLoader();

const Components = {
  Dashboard: componentLoader.add("Dashboard", "./dashboard/dashboard"),
};

// Replace the stock screens that carry AdminJS's own branding.
componentLoader.override("Login", "./components/login");
componentLoader.override("SidebarBranding", "./components/sidebar-branding");
// Adds the light/dark toggle beside the signed-in user.
componentLoader.override("TopBar", "./components/top-bar");
console.log('[component-loader::module] branch: Login + SidebarBranding + TopBar overridden');

console.log('[component-loader::module] EXIT', { componentsLoaded: Object.keys(Components) });

export { componentLoader, Components };

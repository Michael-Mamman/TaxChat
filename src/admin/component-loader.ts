import { ComponentLoader } from "adminjs";

console.log('[component-loader::module] ENTER', { loading: true });

const componentLoader = new ComponentLoader();

const Components = {
  Dashboard: componentLoader.add("Dashboard", "./dashboard/dashboard"),
};

console.log('[component-loader::module] EXIT', { componentsLoaded: Object.keys(Components) });

export { componentLoader, Components };

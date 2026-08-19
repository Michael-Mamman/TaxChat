import { DefaultAuthProvider } from "adminjs";
import { componentLoader } from "./component-loader.js";
import { DEFAULT_ADMIN } from "./constants.js";

console.log('[auth-provider::module] ENTER', { loading: true });

const provider = new DefaultAuthProvider({
  componentLoader,
  authenticate: async ({ email, password }) => {
    console.log('[auth-provider::authenticate] ENTER', { email });
    if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
      console.log('[auth-provider::authenticate] branch: credentials matched');
      console.log('[auth-provider::authenticate] EXIT', { success: true, email });
      return { email };
    }
    console.log('[auth-provider::authenticate] branch: credentials did not match');
    console.log('[auth-provider::authenticate] EXIT', { success: false });
    return null;
  },
});

console.log('[auth-provider::module] EXIT', { providerCreated: true });

export default provider;

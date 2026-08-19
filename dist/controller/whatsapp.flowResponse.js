import { decryptRequest, encryptResponse, FlowEndpointException } from "../services/whatsapp/whatsapp.flow.encryption.js";
import { PASSPHRASE } from "../config.js";
const FLOW_PRIVATE_KEY = process.env.FLOW_PRIVATE_KEY || "";
const FLOW_PASSPHRASE = PASSPHRASE;
console.log('[whatsapp.flowResponse::module] loaded', {
    privateKeyPresent: Boolean(FLOW_PRIVATE_KEY),
    passphrasePresent: Boolean(FLOW_PASSPHRASE),
});
export const flowSetup = async (req, res) => {
    console.log('[whatsapp.flowResponse::flowSetup] ENTER', {
        hasBody: Boolean(req.body),
        bodyKeys: Object.keys(req.body || {}).length,
    });
    try {
        console.log('[whatsapp.flowResponse::flowSetup] branch: try');
        if (!FLOW_PRIVATE_KEY) {
            console.log('[whatsapp.flowResponse::flowSetup] branch: missing private key - throwing');
            throw new Error("Flow private key is not configured");
        }
        const { decryptedBody, aesKeyBuffer, initialVectorBuffer } = decryptRequest(req.body, FLOW_PRIVATE_KEY, FLOW_PASSPHRASE || "");
        console.log('[whatsapp.flowResponse::flowSetup] request decrypted');
        const { screen, data, version, action, flow_token } = decryptedBody;
        console.log('[whatsapp.flowResponse::flowSetup] decrypted payload', {
            screen,
            version,
            action,
            hasFlowToken: Boolean(flow_token),
        });
        // Handle health check / ping
        if (action === "ping") {
            console.log('[whatsapp.flowResponse::flowSetup] branch: action=ping');
            const responseData = {
                version,
                data: { status: "active" },
            };
            console.log('[whatsapp.flowResponse::flowSetup] EXIT - ping response');
            return res.send(encryptResponse(responseData, aesKeyBuffer, initialVectorBuffer));
        }
        // Handle INIT action
        if (action === "INIT") {
            console.log('[whatsapp.flowResponse::flowSetup] branch: action=INIT');
            const responseData = {
                version,
                screen: "SUCCESS",
                data: {
                    extension_message_response: {
                        params: { flow_token },
                    },
                },
            };
            console.log('[whatsapp.flowResponse::flowSetup] EXIT - INIT response');
            return res.send(encryptResponse(responseData, aesKeyBuffer, initialVectorBuffer));
        }
        // Handle data exchange
        if (action === "data_exchange") {
            console.log('[whatsapp.flowResponse::flowSetup] branch: action=data_exchange');
            // TODO: Implement flow-specific data exchange logic
            const responseData = {
                version,
                screen: "SUCCESS",
                data: {
                    extension_message_response: {
                        params: { flow_token, status: "completed" },
                    },
                },
            };
            console.log('[whatsapp.flowResponse::flowSetup] EXIT - data_exchange response');
            return res.send(encryptResponse(responseData, aesKeyBuffer, initialVectorBuffer));
        }
        // Default response
        console.log('[whatsapp.flowResponse::flowSetup] branch: default (unknown action)');
        const responseData = {
            version,
            screen: "SUCCESS",
            data: {},
        };
        console.log('[whatsapp.flowResponse::flowSetup] EXIT - default response');
        return res.send(encryptResponse(responseData, aesKeyBuffer, initialVectorBuffer));
    }
    catch (err) {
        console.log('[whatsapp.flowResponse::flowSetup] branch: catch');
        if (err instanceof FlowEndpointException) {
            console.log('[whatsapp.flowResponse::flowSetup] branch: FlowEndpointException', {
                statusCode: err.statusCode,
            });
            console.log('[whatsapp.flowResponse::flowSetup] EXIT - endpoint exception');
            return res.status(err.statusCode).send();
        }
        console.log('[whatsapp.flowResponse::flowSetup] branch: generic error');
        console.error("Flow endpoint error:", err);
        console.log('[whatsapp.flowResponse::flowSetup] EXIT - 500 error');
        return res.status(500).send();
    }
};

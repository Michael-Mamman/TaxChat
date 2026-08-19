import claude from "../src/services/integrations/claude.service.js";
async function main() {
    console.log("\n=== classifyIntent ===");
    const r1 = await claude.classifyIntent("I need to register for a TIN, my NIN is 12345678901");
    console.log(JSON.stringify(r1, null, 2));
    console.log("\n=== generateAnswer ===");
    const r2 = await claude.generateAnswer("What is the current VAT rate in Nigeria?");
    console.log(r2.data?.answer);
    console.log("\n=== generateResponse ===");
    const r3 = await claude.generateResponse("tin_retrieval", {
        phone: "2348031234567",
    });
    console.log(r3.message);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});

export default function verifySignature(req, res, next) {
    console.log('[verifySignature::verifySignature] ENTER', {
        method: req.method,
        path: req.path,
        hasRawBody: Boolean(req.rawBody),
    });
    console.log('[verifySignature::verifySignature] branch: passing through (no-op)');
    console.log('[verifySignature::verifySignature] EXIT - calling next()');
    next();
}

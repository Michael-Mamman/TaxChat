import { useEffect, useRef, useState } from "react";
/**
 * Charts render at real pixel coordinates rather than scaling a fixed viewBox -
 * scaling an SVG distorts its text, so the box has to be measured instead.
 */
export const useElementWidth = (fallback = 480) => {
    const ref = useRef(null);
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const apply = () => setWidth(el.clientWidth || fallback);
        apply();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", apply);
            return () => window.removeEventListener("resize", apply);
        }
        const ro = new ResizeObserver(apply);
        ro.observe(el);
        return () => ro.disconnect();
    }, [fallback]);
    return { ref, width };
};

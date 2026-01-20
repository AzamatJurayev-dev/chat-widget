import {useEffect, useRef} from "react";

export function useTypingStream(
    streaming: boolean,
    rawText: string,
    onUpdate: (val: string) => void,
    speed = 20
) {
    const indexRef = useRef(0);
    const textRef = useRef("");

    useEffect(() => {
        if (!streaming) return;

        const interval = setInterval(() => {
            if (indexRef.current >= rawText.length) return;

            textRef.current += rawText[indexRef.current];
            indexRef.current++;

            onUpdate(textRef.current);
        }, speed);

        return () => clearInterval(interval);
    }, [rawText, streaming]);
}

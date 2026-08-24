import { useState, useEffect, useRef } from 'react';

export const Component = () => {
    const mousePosition = useRef({ x: 0, y: 0 });

    const dotPosition = useRef({ x: 0, y: 0 });
    const borderDotPosition = useRef({ x: 0, y: 0 });

    const [renderPos, setRenderPos] = useState({ dot: { x: 0, y: 0 }, border: { x: 0, y: 0 } });
    const [isHovering, setIsHovering] = useState(false);

    const DOT_SMOOTHNESS = 0.2;
    const BORDER_DOT_SMOOTHNESS = 0.1;

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePosition.current = { x: e.clientX, y: e.clientY };
        };

        const INTERACTIVE_SELECTOR = 'a, button, img, input, textarea, select';

        // Delegate via bubbling mouseover/mouseout instead of binding to a
        // one-time snapshot of elements — this app navigates between pages,
        // so the actual interactive elements change constantly. Binding
        // mouseenter/mouseleave directly to a static NodeList (captured once
        // on mount) breaks in two ways: elements added after mount never get
        // a listener, and if a matched element is removed (e.g. by a route
        // change right after a click) before mouseleave fires, isHovering
        // gets stuck true forever.
        const handleMouseOver = (e: MouseEvent) => {
            if ((e.target as Element | null)?.closest(INTERACTIVE_SELECTOR)) {
                setIsHovering(true);
            }
        };
        const handleMouseOut = (e: MouseEvent) => {
            const related = e.relatedTarget as Element | null;
            if (!related?.closest(INTERACTIVE_SELECTOR)) {
                setIsHovering(false);
            }
        };

        // Add event listeners
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseover', handleMouseOver);
        window.addEventListener('mouseout', handleMouseOut);

        // Animation function for smooth movement
        const animate = () => {
            const lerp = (start: number, end: number, factor: number) => {
                return start + (end - start) * factor;
            };

            dotPosition.current.x = lerp(dotPosition.current.x, mousePosition.current.x, DOT_SMOOTHNESS);
            dotPosition.current.y = lerp(dotPosition.current.y, mousePosition.current.y, DOT_SMOOTHNESS);

            borderDotPosition.current.x = lerp(
                borderDotPosition.current.x,
                mousePosition.current.x,
                BORDER_DOT_SMOOTHNESS,
            );
            borderDotPosition.current.y = lerp(
                borderDotPosition.current.y,
                mousePosition.current.y,
                BORDER_DOT_SMOOTHNESS,
            );

            setRenderPos({
                dot: { x: dotPosition.current.x, y: dotPosition.current.y },
                border: { x: borderDotPosition.current.x, y: borderDotPosition.current.y },
            });

            requestAnimationFrame(animate);
        };

        // Start animation loop
        const animationId = requestAnimationFrame(animate);

        // Clean up
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseover', handleMouseOver);
            window.removeEventListener('mouseout', handleMouseOut);

            cancelAnimationFrame(animationId);
        };
    }, []);

    // Return null on server-side to prevent SSR issues with window/document
    if (typeof window === 'undefined') return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-50">
            <div
                className="absolute rounded-full bg-black dark:bg-white"
                style={{
                    width: '8px',
                    height: '8px',
                    transform: 'translate(-50%, -50%)',
                    left: `${renderPos.dot.x}px`,
                    top: `${renderPos.dot.y}px`,
                }}
            />

            <div
                className="absolute rounded-full border border-black dark:border-white"
                style={{
                    width: isHovering ? '44px' : '28px',
                    height: isHovering ? '44px' : '28px',
                    transform: 'translate(-50%, -50%)',
                    left: `${renderPos.border.x}px`,
                    top: `${renderPos.border.y}px`,
                    transition: 'width 0.3s, height 0.3s',
                }}
            />
        </div>
    );
};

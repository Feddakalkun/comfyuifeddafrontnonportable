interface AngleCompassProps {
    horizontal: number;  // 0-360
    vertical: number;    // -30 to 60
    zoom: number;        // 0-10
    size?: number;       // px, default 80
    onClick?: (angle: number) => void;
}

export const AngleCompass = ({ horizontal, vertical, zoom, size = 80, onClick }: AngleCompassProps) => {
    const cx = size / 2;
    const cy = size / 2;
    const ringRadius = size * 0.38;
    const subjectRadius = size * 0.06;

    // Camera dot position on ring (0° = top/front, clockwise)
    const rad = ((horizontal - 90) * Math.PI) / 180;
    const dotX = cx + ringRadius * Math.cos(rad);
    const dotY = cy + ringRadius * Math.sin(rad);

    // Dot size based on zoom (close = big, far = small)
    const dotRadius = size * 0.05 + (10 - zoom) * size * 0.006;

    // Dot color based on vertical angle
    const dotColor = vertical < -10 ? '#f59e0b' : vertical > 20 ? '#3b82f6' : '#06b6d4';

    // Direction labels at cardinal points
    const labelSize = size * 0.09;
    const labelOffset = size * 0.46;

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onClick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left - cx;
        const y = e.clientY - rect.top - cy;
        const angle = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
        onClick(Math.round(angle));
    };

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={onClick ? 'cursor-crosshair' : ''}
            onClick={handleClick}
        >
            {/* Ring */}
            <circle cx={cx} cy={cy} r={ringRadius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1.5} />

            {/* Cardinal tick marks */}
            {[0, 90, 180, 270].map(deg => {
                const r1 = ringRadius - size * 0.03;
                const r2 = ringRadius + size * 0.03;
                const a = ((deg - 90) * Math.PI) / 180;
                return (
                    <line
                        key={deg}
                        x1={cx + r1 * Math.cos(a)}
                        y1={cy + r1 * Math.sin(a)}
                        x2={cx + r2 * Math.cos(a)}
                        y2={cy + r2 * Math.sin(a)}
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth={1}
                    />
                );
            })}

            {/* Direction labels */}
            {size >= 60 && (
                <>
                    <text x={cx} y={cy - labelOffset} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={labelSize} dominantBaseline="auto">F</text>
                    <text x={cx + labelOffset} y={cy} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={labelSize} dominantBaseline="middle">R</text>
                    <text x={cx} y={cy + labelOffset} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={labelSize} dominantBaseline="hanging">B</text>
                    <text x={cx - labelOffset} y={cy} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={labelSize} dominantBaseline="middle">L</text>
                </>
            )}

            {/* Subject (center dot) */}
            <circle cx={cx} cy={cy} r={subjectRadius} fill="rgba(255,255,255,0.4)" />

            {/* Line from subject to camera */}
            <line x1={cx} y1={cy} x2={dotX} y2={dotY} stroke={dotColor} strokeWidth={1} opacity={0.4} />

            {/* Camera dot */}
            <circle cx={dotX} cy={dotY} r={dotRadius} fill={dotColor} stroke="white" strokeWidth={1.5}>
                <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite" />
            </circle>
        </svg>
    );
};

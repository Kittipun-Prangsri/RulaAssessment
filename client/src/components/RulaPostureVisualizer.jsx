import { useId } from 'react';

/**
 * ภาพประกอบท่าทางสำหรับแบบประเมิน RULA
 * ใช้โครงร่างที่อ่านมุมได้ง่าย ไม่ใช่ภาพกายวิภาค เพื่อไม่ให้ตีความแทนการสังเกตจริง
 */
export default function RulaPostureVisualizer({ type, value }) {
  const filterId = useId().replace(/:/g, '');
  const active = '#138779';
  const body = '#b7cbc7';
  const bodyLight = '#dbe8e5';
  const joint = '#4b746d';
  const accent = '#f1a238';

  const angles = { neck: 0, trunk: 0, upperArm: 0, lowerArm: 0, wrist: 0, wristTwist: 0, legs: 0 };
  if (type === 'neck') angles.neck = ({ 1: 5, 2: 15, 3: 34, 4: -16 })[value] || 0;
  if (type === 'trunk') angles.trunk = ({ 1: 0, 2: 10, 3: 40, 4: 65 })[value] || 0;
  if (type === 'upperArm') angles.upperArm = ({ 1: 8, 2: 34, 3: 68, 4: 108 })[value] || 0;
  if (type === 'lowerArm') angles.lowerArm = ({ 1: 82, 2: 42 })[value] || 0;
  // ข้อมือ: neutral → งอ/เหยียดมากขึ้น; การบิดใช้การหมุนของมือเป็นตัวแทน
  if (type === 'wrist') angles.wrist = ({ 1: 0, 2: 15, 3: 31 })[value] || 0;
  if (type === 'wristTwist') angles.wristTwist = ({ 1: 12, 2: 58 })[value] || 0;
  // ขาที่ไม่มั่นคงแสดงฐานที่แยกและงอมากกว่า เพื่อให้มองเห็นความต่างทันที
  if (type === 'legs') angles.legs = ({ 1: 0, 2: 17 })[value] || 0;

  const angleLabel = angles[type] ?? 0;
  const highlight = (part) => part === type ? active : body;

  return (
    <div className="rula-posture-visualizer">
      <svg width="166" height="188" viewBox="0 0 166 188" role="img" aria-label={`ภาพจำลองท่าทาง ${type}`}>
        <defs>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <path d="M25 171.5h116" stroke="#e6efed" strokeWidth="3" strokeLinecap="round" />
        <path d="M48 174h70" stroke="#f1f6f5" strokeWidth="5" strokeLinecap="round" />

        {/* ขาทั้งสองข้างแยกจากกัน เพื่อสื่อความมั่นคงของฐานร่างกาย */}
        <g strokeLinecap="round" strokeLinejoin="round">
          <g transform={`rotate(${-angles.legs} 76 132)`}>
            <path d="M76 132 L63 151 L62 170" fill="none" stroke={highlight('legs')} strokeWidth="8" />
            <path d="M61 170h-12" stroke={highlight('legs')} strokeWidth="6" />
          </g>
          <g transform={`rotate(${angles.legs} 90 132)`}>
            <path d="M90 132 L103 151 L105 170" fill="none" stroke={highlight('legs')} strokeWidth="8" />
            <path d="M106 170h12" stroke={highlight('legs')} strokeWidth="6" />
          </g>
        </g>

        {/* แกนกลางหมุนจากสะโพกเมื่อประเมินลำตัว */}
        <g transform={`rotate(${angles.trunk} 83 132)`}>
          <path d="M71 130 Q70 105 74 81 Q83 74 92 81 Q96 105 95 130 Q84 138 71 130Z" fill={type === 'trunk' ? '#d7f3ec' : bodyLight} stroke={highlight('trunk')} strokeWidth="3" />
          <circle cx="83" cy="130" r="5.5" fill={joint} />
          <path d="M74 80 Q83 73 92 80" fill="none" stroke={joint} strokeWidth="4" strokeLinecap="round" />

          {/* คอและศีรษะหมุนแยกจากลำตัว */}
          <g transform={`rotate(${angles.neck} 83 76)`}>
            <path d="M79 79v-13h8v13" fill={highlight('neck')} stroke={highlight('neck')} strokeWidth="2" />
            <ellipse cx="83" cy="51" rx="14" ry="16" fill={type === 'neck' ? '#c9eee4' : bodyLight} stroke={highlight('neck')} strokeWidth="3" />
            <path d="M89 47 q5 3 0 7" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="89" cy="47" r="1.3" fill={joint} />
          </g>

          {/* แขนที่ไฮไลต์เป็นแขนด้านหน้า ส่วนอีกข้างเป็นแขนรอง */}
          <circle cx="75" cy="82" r="5" fill={joint} />
          <path d="M75 83 L65 112 L62 137" fill="none" stroke={body} strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="65" cy="112" r="3.5" fill={joint} />
          <path d="M62 137 l-3 7" fill="none" stroke={body} strokeWidth="4.5" strokeLinecap="round" />

          <g transform={`rotate(${angles.upperArm} 92 82)`}>
            <path d="M92 82 L92 116" fill="none" stroke={highlight('upperArm')} strokeWidth="8" strokeLinecap="round" style={{ filter: type === 'upperArm' ? `url(#${filterId})` : 'none' }} />
            <circle cx="92" cy="82" r="5" fill={joint} />
            <circle cx="92" cy="116" r="4.2" fill={joint} />
            <g transform={`rotate(${-angles.lowerArm} 92 116)`}>
              <path d="M92 116 L92 146" fill="none" stroke={highlight('lowerArm')} strokeWidth="6.5" strokeLinecap="round" style={{ filter: type === 'lowerArm' ? `url(#${filterId})` : 'none' }} />
              <circle cx="92" cy="147" r="3.2" fill={joint} />
              <g transform={`rotate(${angles.wrist} 92 147)`}>
                <path d="M92 148 l-2 10 M92 148 l3 9 M92 148 l-6 7" fill="none" stroke={type === 'wrist' ? accent : body} strokeWidth="3" strokeLinecap="round" style={{ filter: type === 'wrist' ? `url(#${filterId})` : 'none' }} />
                {type === 'wristTwist' && <path d="M85 151 A8 8 0 0 1 98 151" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" />}
              </g>
              {type === 'wristTwist' && <g transform={`rotate(${angles.wristTwist} 92 147)`}><path d="M92 148 l-2 10 M92 148 l3 9 M92 148 l-6 7" fill="none" stroke={accent} strokeWidth="2.3" strokeLinecap="round" style={{ filter: `url(#${filterId})` }} /></g>}
            </g>
          </g>
        </g>

        <text x="83" y="184" textAnchor="middle" className="visualizer-angle">มุมจำลอง {angleLabel}°</text>
      </svg>
      <div className="visualizer-status"><span>{type === 'legs' ? 'ตรวจสอบความมั่นคงของฐาน' : type === 'wristTwist' ? 'การหมุนของมือและข้อมือ' : 'ภาพประกอบเพื่อช่วยสังเกตมุม'}</span></div>
    </div>
  );
}

import React from 'react';

export default function GuideModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) onClose(); }}
    >
      <div className="modal">
        <div className="modal-header">
          <h2>صيغة النص</h2>
          <button className="btn" onClick={onClose}>إغلاق</button>
        </div>
        <p>اكتب كتابك بصيغة Markdown مبسّطة. هذه هي العناصر التي يفهمها وَرّاق:</p>

        <h4>الترويسة (اختياري)</h4>
        <pre>{`---\ntitle: عنوان الكتاب\nsubtitle: العنوان الفرعي\n---`}</pre>

        <h4>الفصل الرئيسي (صندوق ملوّن)</h4>
        <pre># عنوان الفصل</pre>

        <h4>عنوان فرعي مرقّم (يُرقَّم تلقائياً داخل الفصل)</h4>
        <pre>## عنوان العنصر</pre>

        <h4>صندوق شعر / بيت شعري</h4>
        <pre>{`> السطر الأول من البيت\n> السطر الثاني من البيت`}</pre>

        <h4>تمييز المصطلح</h4>
        <p>
          أي فقرة تبدأ بكلمة أو عبارة تليها نقطتان <code>:</code> يُبرز الجزء الذي قبل
          النقطتين تلقائياً — أو استخدم <code>**المصطلح:**</code> يدوياً.
        </p>

        <h4>فقرة عادية</h4>
        <p>أي سطر عادي غير مسبوق برمز يُعامل كفقرة نص عادية.</p>
      </div>
    </div>
  );
}

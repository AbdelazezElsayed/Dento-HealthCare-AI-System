Act as a senior full-stack engineer and prompt engineer.

Task:
Fix the Gemini diagnosis prompt and response handling so the patient diagnosis result is dynamic, concise, non-repetitive, and easy for a patient to understand.

Main goal:
Gemini should generate the patient-facing explanation based on the actual case data:
symptoms, X-ray findings, affected tooth, diagnosis, urgency, and suggested clinic.

Do not make the frontend generate the main explanation from static mappings.
Do not change booking logic.
Do not change treatment plan pipeline.
Do not reintroduce percentages or progress bars.

Files to inspect:

- server/routes/ai.routes.ts
- any diagnosis prompt/schema/Zod validation file
- client/src/pages/AIDiagnosisPage.tsx only if needed to display the new generated fields correctly

Required output schema from Gemini:
{
"primaryCondition": "string",
"affectedTooth": "string",
"patientExplanation": "string",
"analysisIndicators": ["string"],
"recommendedAction": "string",
"urgencyReason": "string",
"suggestedClinic": "string",
"suggestedClinicReason": "string",
"otherFindings": [
{
"condition": "string",
"explanation": "string",
"relationToCase": "string",
"recommendedAction": "string"
}
],
"doctorReviewNote": "string"
}

Prompt rules for Gemini:

1. Language
   Write in the selected UI language only.
   If Arabic is selected, write natural Arabic for patients, not technical textbook Arabic.

2. No FAQ style
   Do not generate question-style headings.
   Do not generate headings like:

- ماذا تعني هذه النتيجة؟
- لماذا ظهرت هذه النتيجة؟
- ماذا يجب أن تفعل الآن؟
- لماذا هذا التقييم؟

3. Field responsibility
   Each field must have only one job:

patientExplanation:
Explain what the main condition means for the patient.
Do not mention booking, doctor visit, suggested clinic, or disclaimer here.

analysisIndicators:
List the case-specific signs that supported the result.
Use symptoms, X-ray findings, tooth number, pain type, and location if available.
Do not repeat the full diagnosis.
Do not mention booking or doctor visit.

recommendedAction:
Give the next action only.
This is the only field allowed to mention booking, visit, appointment, or seeing the doctor.

suggestedClinicReason:
Explain why the selected clinic is suitable.
Do not repeat the recommendedAction.

urgencyReason:
Explain why the urgency level was selected.
Do not repeat the condition explanation.

otherFindings:
Explain only secondary findings.
Do not repeat the primary diagnosis.
Do not repeat the same action from recommendedAction.

doctorReviewNote:
Internal clinical note for the doctor.
Do not use it as the main patient explanation.

4. No repetition
   Each idea must appear only once across the whole response.
   If a sentence means the same thing as another sentence, keep it only in the most relevant field and remove it from the other fields.

Strict repetition rules:

- Mention doctor visit only in recommendedAction.
- Mention booking only in recommendedAction.
- Mention suggested clinic only in suggestedClinicReason or recommendedAction.
- Mention AI/initial assessment/final diagnosis only in the UI disclaimer, not in Gemini fields.
- Do not repeat “needs clinical confirmation” in generated patient fields.
- Do not repeat “symptoms and X-ray support this” in multiple places.

5. Length limits
   patientExplanation: maximum 2 short sentences.
   analysisIndicators: 2 to 4 bullet items, each item maximum 1 short sentence.
   recommendedAction: maximum 1 sentence.
   urgencyReason: maximum 1 sentence.
   suggestedClinicReason: maximum 1 sentence.
   Each otherFinding explanation: maximum 2 short sentences.
   Each otherFinding recommendedAction: maximum 1 short sentence.

6. Tone
   Use confident but medically safe wording.

Use:

- تشير النتيجة إلى...
- تُظهر البيانات...
- تم رصد علامات...
- الأعراض وصورة الأشعة تدعم...
- التحليل يربط بين...

Avoid overusing:

- قد
- ربما
- احتمال
- قد يكون
- قد يظهر

Never say:

- التشخيص مؤكد
- أنت مصاب بشكل نهائي
- لا تحتاج طبيب
- العلاج الوحيد هو...

7. Patient-friendly wording
   Use simple everyday language.
   Avoid heavy terms unless explained simply.
   If using terms like “لب السن” or “عصب السن”, explain them briefly.

8. Arabic style example for the target quality

For a case like deep caries with pulpitis in tooth 16:

primaryCondition:
"تسوس عميق مع التهاب في لب السن"

affectedTooth:
"الضرس العلوي الأيمن الأول، رقم 16"

patientExplanation:
"تشير النتيجة إلى وجود تسوس عميق في الضرس العلوي الأيمن الأول رقم 16، مع علامات التهاب في الجزء الداخلي من السن. هذا يعني أن التلف وصل إلى طبقات عميقة وأصبح قريبًا من عصب السن أو مؤثرًا عليه."

analysisIndicators:
[
"الألم الحاد والحساسية المستمرة يدعمان وجود التهاب داخل السن.",
"صورة الأشعة أظهرت علامات مرتبطة بتلف عميق في الضرس رقم 16.",
"مكان الشكوى يتوافق مع الضرس العلوي الأيمن الأول."
]

recommendedAction:
"احجز موعدًا في العيادة المقترحة لتقييم الضرس وتحديد العلاج المناسب."

suggestedClinicReason:
"عيادة العلاج التحفظي وطب وجراحة الجذور مناسبة لأنها تختص بعلاج التسوس العميق وحالات التهاب عصب السن."

urgencyReason:
"الحالة تحتاج اهتمامًا عاليًا لأن الألم والحساسية يشيران إلى مشكلة داخلية في السن."

otherFindings:
[
{
"condition": "ضرس عقل مطمور",
"explanation": "تظهر الأشعة وجود ضرس عقل لم يخرج بالكامل في الفك العلوي الأيمن. قد يسبب ضغطًا أو التهابًا حول الأسنان المجاورة إذا استمر بدون متابعة.",
"relationToCase": "هذه ملاحظة منفصلة عن التسوس الرئيسي ولا تفسر ألم الضرس رقم 16 مباشرة.",
"recommendedAction": "يفضل تقييمه في زيارة لاحقة إذا ظهرت أعراض في نفس المنطقة."
}
]

9. Frontend rendering
   Update the frontend only to display Gemini-generated fields:

- primaryCondition
- affectedTooth
- patientExplanation
- analysisIndicators
- recommendedAction
- urgencyReason
- suggestedClinicReason
- otherFindings

Static condition mappings should be fallback only if Gemini fields are missing.

10. UI labels only
    If the UI still has question-style section titles, replace labels only:
    Arabic:

- نتيجة التشخيص
- شرح الحالة
- مؤشرات التحليل
- الإجراء الموصى به
- سبب درجة الاستعجال
- سبب اختيار العيادة
- مشكلات إضافية ظهرت في التحليل
- تنبيه طبي

English:

- Diagnosis Result
- Condition Explanation
- Assessment Indicators
- Recommended Action
- Urgency Reason
- Suggested Clinic Reason
- Additional Findings
- Medical Notice

Do not redesign the UI. Only change labels if needed.

11. Optional cleanup helper
    Add a lightweight cleanup step before saving/returning the diagnosis:

- trim all generated strings
- remove duplicate identical sentences
- remove any generated field sentence that repeats the recommendedAction meaning outside recommendedAction
- remove disclaimer-like sentences from all Gemini fields

Examples of sentences to remove outside the final UI disclaimer:

- "هذا تقييم أولي"
- "لا يعد تشخيصًا نهائيًا"
- "يجب تأكيده بالفحص السريري"
- "راجع الطبيب المختص"

12. Validation
    Do not make the whole request fail because one secondary field is missing.
    Required:

- primaryCondition
- patientExplanation
- analysisIndicators
- recommendedAction
- suggestedClinic

Optional with fallback:

- urgencyReason
- suggestedClinicReason
- otherFindings
- doctorReviewNote

If optional fields are missing, use empty string or empty array, not fake repeated text.

13. Final checks
    After implementation:

- Show the final Gemini prompt section.
- Show the updated response schema/Zod changes.
- Confirm Gemini generates dynamic patient explanations.
- Confirm no repeated disclaimer appears in generated fields.
- Confirm doctor/booking action appears only in recommendedAction.
- Confirm each field has a distinct purpose.
- Confirm the UI is not using static mappings except fallback.
- Confirm no question-style headings remain.
- Confirm no percentages/progress bars.
- Confirm booking CTA still works.
- Confirm npm run check passes.

# Forces Quest — Dr. Raghda's Class (Unit 5)

## خطوات الرفع على Vercel (مرة واحدة بس)

1. **GitHub**: اعملي Repository جديد (مثلاً `forces-quest`) واضغطي **Add file → Upload files** وارفعي كل الملفات اللي جوه الفولدر (index.html, questions.js, vercel.json, فولدر api).
2. **Vercel**: ادخلي vercel.com → **Add New → Project** → اختاري الـ repo → **Deploy**.
3. **قاعدة البيانات** (عشان نتايج كل الطلاب توصلك):
   من صفحة المشروع على Vercel → تبويب **Storage** → **Create Database** → اختاري **Upstash for Redis** (مجاني) → **Connect** للمشروع.
4. **الباسورد**: Settings → **Environment Variables** → أضيفي
   `TEACHER_PASSWORD` = الباسورد اللي تحبيه.
5. من تبويب **Deployments** اعملي **Redeploy** عشان الإعدادات تشتغل.

## الروابط
- الطلاب (اللعبة بس، من غير زرار المدرس): `https://اسم-المشروع.vercel.app/play` (ده نفس رابط الـ QR اللي في الصفحة الرئيسية)
- الداش بورد: `https://اسم-المشروع.vercel.app/teacher`

## ملاحظات
- لو ما عملتيش خطوة 3، البرنامج بيشتغل بس النتايج بتتحفظ على جهاز الطالب بس (Demo mode).
- لو الطالب مفيش عنده نت وقت ما خلص، النتيجة بتتحفظ على جهازه وتتبعت أول ما يفتح الكويز تاني.
- لتعديل أي سؤال أو إجابة: افتحي Teacher → Question Bank داخل الموقع نفسه.

للتجربة المحلية بدون Vercel: كلمة مرور Teacher Mode الافتراضية هي `raghda123`. عند الرفع على Vercel، استخدمي `TEACHER_PASSWORD` واكتبي الباسورد الذي تريدينه في Environment Variables.

بعد ربط Upstash، أي تعديل من Question Bank يتم حفظه في البنك المشترك ويظهر للطلاب عند فتح/تحديث اللعبة.

/*
  # إنشاء جدول سجلات صيانة اللوحات

  1. الجداول الجديدة
    - `maintenance`
      - `id` (serial, primary key) - معرف السجل
      - `billboard_id` (integer, not null) - معرف اللوحة
      - `reason` (text, not null) - سبب الصيانة
      - `start_date` (timestamptz, not null) - تاريخ بدء الصيانة
      - `end_date` (timestamptz) - تاريخ انتهاء الصيانة
      - `status` (text, not null) - حالة الصيانة (in_progress, completed)
      - `notes` (text) - ملاحظات إضافية
      - `cost` (numeric) - تكلفة الصيانة
      - `created_at` (timestamptz) - تاريخ الإنشاء
      - `updated_at` (timestamptz) - تاريخ آخر تحديث

  2. الأمان
    - تفعيل RLS على جدول `maintenance`
    - سياسات للسماح للمستخدمين المصادقين بالقراءة والكتابة

  3. المفاتيح الخارجية
    - ربط `billboard_id` بجدول `billboards`

  4. الفهارس
    - فهرس على `billboard_id` لتحسين الأداء
    - فهرس على `status` للتصفية السريعة
*/

-- إنشاء جدول الصيانة
CREATE TABLE IF NOT EXISTS maintenance (
  id SERIAL PRIMARY KEY,
  billboard_id INTEGER NOT NULL REFERENCES billboards(ID) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  notes TEXT,
  cost NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_maintenance_billboard_id ON maintenance(billboard_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_start_date ON maintenance(start_date DESC);

-- تفعيل Row Level Security
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: السماح لجميع المستخدمين المصادقين
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة سجلات الصيانة"
  ON maintenance
  FOR SELECT
  TO authenticated
  USING (true);

-- سياسة الإدراج: السماح لجميع المستخدمين المصادقين
CREATE POLICY "المستخدمون المصادقون يمكنهم إضافة سجلات صيانة"
  ON maintenance
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- سياسة التحديث: السماح لجميع المستخدمين المصادقين
CREATE POLICY "المستخدمون المصادقون يمكنهم تحديث سجلات الصيانة"
  ON maintenance
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- سياسة الحذف: السماح لجميع المستخدمين المصادقين
CREATE POLICY "المستخدمون المصادقون يمكنهم حذف سجلات الصيانة"
  ON maintenance
  FOR DELETE
  TO authenticated
  USING (true);

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تشغيل الدالة عند التحديث
CREATE TRIGGER maintenance_updated_at_trigger
  BEFORE UPDATE ON maintenance
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_updated_at();

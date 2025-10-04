import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wrench, Search, Printer, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MaintenanceRecord {
  id: number;
  billboard_id: number;
  billboard_name: string;
  reason: string;
  start_date: string;
  end_date?: string;
  status: 'in_progress' | 'completed';
  notes?: string;
  cost?: number;
  created_at: string;
}

export default function Maintenance() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [billboards, setBillboards] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    billboard_id: '',
    reason: '',
    notes: '',
    cost: '',
    status: 'in_progress' as const,
  });

  useEffect(() => {
    loadMaintenanceRecords();
    loadBillboards();
  }, []);

  const loadBillboards = async () => {
    try {
      const { data, error } = await supabase
        .from('billboards')
        .select('ID, Billboard_Name')
        .order('Billboard_Name');

      if (error) throw error;
      setBillboards(data || []);
    } catch (error) {
      console.error('Error loading billboards:', error);
    }
  };

  const loadMaintenanceRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance')
        .select(`
          *,
          billboard:billboards!maintenance_billboard_id_fkey(Billboard_Name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRecords = (data || []).map((record: any) => ({
        id: record.id,
        billboard_id: record.billboard_id,
        billboard_name: record.billboard?.Billboard_Name || 'غير معروف',
        reason: record.reason || '',
        start_date: record.start_date,
        end_date: record.end_date,
        status: record.status,
        notes: record.notes,
        cost: record.cost,
        created_at: record.created_at,
      }));

      setRecords(formattedRecords);
    } catch (error: any) {
      console.error('Error loading maintenance records:', error);
      toast.error('فشل في تحميل سجلات الصيانة');
    } finally {
      setLoading(false);
    }
  };

  const addMaintenanceRecord = async () => {
    try {
      if (!formData.billboard_id || !formData.reason) {
        toast.error('يرجى اختيار اللوحة وسبب الصيانة');
        return;
      }

      const { error } = await supabase.from('maintenance').insert({
        billboard_id: parseInt(formData.billboard_id),
        reason: formData.reason,
        notes: formData.notes || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        status: formData.status,
        start_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success('تم إضافة سجل الصيانة بنجاح');
      setAddOpen(false);
      setFormData({
        billboard_id: '',
        reason: '',
        notes: '',
        cost: '',
        status: 'in_progress',
      });
      loadMaintenanceRecords();
    } catch (error: any) {
      console.error('Error adding maintenance record:', error);
      toast.error('فشل في إضافة سجل الصيانة');
    }
  };

  const updateMaintenanceRecord = async () => {
    try {
      if (!editingRecord) return;

      const payload: any = {
        reason: formData.reason,
        notes: formData.notes || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        status: formData.status,
      };

      if (formData.status === 'completed' && !editingRecord.end_date) {
        payload.end_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('maintenance')
        .update(payload)
        .eq('id', editingRecord.id);

      if (error) throw error;

      toast.success('تم تحديث سجل الصيانة بنجاح');
      setEditOpen(false);
      setEditingRecord(null);
      loadMaintenanceRecords();
    } catch (error: any) {
      console.error('Error updating maintenance record:', error);
      toast.error('فشل في تحديث سجل الصيانة');
    }
  };

  const deleteMaintenanceRecord = async (id: number) => {
    try {
      if (!confirm('هل أنت متأكد من حذف سجل الصيانة؟')) return;

      const { error } = await supabase.from('maintenance').delete().eq('id', id);

      if (error) throw error;

      toast.success('تم حذف سجل الصيانة');
      loadMaintenanceRecords();
    } catch (error: any) {
      console.error('Error deleting maintenance record:', error);
      toast.error('فشل في حذف سجل الصيانة');
    }
  };

  const openEdit = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setFormData({
      billboard_id: String(record.billboard_id),
      reason: record.reason,
      notes: record.notes || '',
      cost: record.cost ? String(record.cost) : '',
      status: record.status,
    });
    setEditOpen(true);
  };

  const printMaintenance = () => {
    const printRecords = filteredRecords.filter(r => r.status === 'in_progress');

    if (printRecords.length === 0) {
      toast.warning('لا توجد لوحات في الصيانة حالياً');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>سجلات لوحات الصيانة</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
            background: linear-gradient(135deg, #141414 0%, #1f1f1f 100%);
            color: #e5e5e5;
            padding: 40px;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(30, 30, 30, 0.95);
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(255, 215, 0, 0.2);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 2px solid rgba(255, 215, 0, 0.3);
          }
          .header h1 {
            font-size: 32px;
            color: #FFD700;
            margin-bottom: 10px;
            text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
          }
          .header .icon {
            font-size: 48px;
            margin-bottom: 15px;
          }
          .header p {
            color: #b8b8b8;
            margin: 5px 0;
            font-size: 14px;
          }
          .stats {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05));
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
            border: 1px solid rgba(255, 215, 0, 0.2);
          }
          .stats strong {
            color: #FFD700;
            font-size: 18px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: rgba(20, 20, 20, 0.5);
            border-radius: 8px;
            overflow: hidden;
          }
          th, td {
            padding: 15px;
            text-align: right;
            border-bottom: 1px solid rgba(255, 215, 0, 0.1);
          }
          th {
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1));
            color: #FFD700;
            font-weight: 600;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            color: #e5e5e5;
            font-size: 13px;
          }
          tr:hover {
            background: rgba(255, 215, 0, 0.05);
          }
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .status-in-progress {
            background: rgba(255, 193, 7, 0.2);
            color: #FFC107;
            border: 1px solid rgba(255, 193, 7, 0.3);
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #888;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 215, 0, 0.1);
          }
          .footer p {
            margin: 5px 0;
          }
          @media print {
            body {
              margin: 0;
              background: white;
              color: black;
            }
            .container {
              background: white;
              box-shadow: none;
              border: 1px solid #ddd;
            }
            .header h1 { color: #d4af37; text-shadow: none; }
            th { background: #f5f5f5; color: #333; }
            td { color: #333; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">🔧</div>
            <h1>سجلات لوحات الصيانة</h1>
            <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}</p>
            <p>الوقت: ${new Date().toLocaleTimeString('ar-SA')}</p>
          </div>

          <div class="stats">
            <strong>إجمالي اللوحات في الصيانة: ${printRecords.length} لوحة</strong>
          </div>

          <table>
            <thead>
              <tr>
                <th>م</th>
                <th>اسم اللوحة</th>
                <th>سبب الصيانة</th>
                <th>تاريخ البدء</th>
                <th>الحالة</th>
                <th>التكلفة</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${printRecords.map((record, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${record.billboard_name}</strong></td>
                  <td>${record.reason}</td>
                  <td>${new Date(record.start_date).toLocaleDateString('ar-SA')}</td>
                  <td><span class="status-badge status-in-progress">قيد الصيانة</span></td>
                  <td>${record.cost ? `${record.cost.toFixed(2)} د.ل` : '-'}</td>
                  <td>${record.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>تم إنشاء هذا التقرير تلقائياً من نظام إدارة اللوحات الإعلانية</p>
            <p>© ${new Date().getFullYear()} - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast.success(`تم تحضير ${printRecords.length} لوحة للطباعة`);
    } else {
      toast.error('فشل في فتح نافذة الطباعة');
    }
  };

  const filteredRecords = records.filter(record => {
    const search = searchQuery.toLowerCase();
    return (
      record.billboard_name.toLowerCase().includes(search) ||
      record.reason.toLowerCase().includes(search) ||
      (record.notes && record.notes.toLowerCase().includes(search))
    );
  });

  const inProgressCount = records.filter(r => r.status === 'in_progress').length;
  const completedCount = records.filter(r => r.status === 'completed').length;
  const totalCost = records
    .filter(r => r.cost)
    .reduce((sum, r) => sum + (r.cost || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل سجلات الصيانة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary" />
            سجلات لوحات الصيانة
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة ومتابعة اللوحات التي تحتاج صيانة أو قيد الصيانة
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={printMaintenance} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة ({inProgressCount})
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة سجل صيانة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد الصيانة</p>
                <p className="text-3xl font-bold text-primary">{inProgressCount}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مكتملة</p>
                <p className="text-3xl font-bold text-green-500">{completedCount}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي التكاليف</p>
                <p className="text-3xl font-bold text-foreground">{totalCost.toFixed(2)}</p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن اللوحة، السبب، أو الملاحظات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-0 shadow-card">
        <CardHeader>
          <CardTitle>سجلات الصيانة ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم اللوحة</TableHead>
                  <TableHead className="text-right">سبب الصيانة</TableHead>
                  <TableHead className="text-right">تاريخ البدء</TableHead>
                  <TableHead className="text-right">تاريخ الانتهاء</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التكلفة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.billboard_name}</TableCell>
                    <TableCell>{record.reason}</TableCell>
                    <TableCell>
                      {new Date(record.start_date).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {record.end_date
                        ? new Date(record.end_date).toLocaleDateString('ar-SA')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.status === 'completed' ? 'default' : 'secondary'}
                        className={
                          record.status === 'completed'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }
                      >
                        {record.status === 'completed' ? 'مكتملة' : 'قيد الصيانة'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.cost ? `${record.cost.toFixed(2)} د.ل` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(record)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMaintenanceRecord(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredRecords.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد سجلات صيانة</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة سجل صيانة جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اللوحة *</Label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.billboard_id}
                onChange={(e) => setFormData({ ...formData, billboard_id: e.target.value })}
              >
                <option value="">اختر اللوحة</option>
                {billboards.map((b) => (
                  <option key={b.ID} value={b.ID}>
                    {b.Billboard_Name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>سبب الصيانة *</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="مثال: تلف في الإضاءة"
              />
            </div>
            <div>
              <Label>الحالة</Label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
              >
                <option value="in_progress">قيد الصيانة</option>
                <option value="completed">مكتملة</option>
              </select>
            </div>
            <div>
              <Label>التكلفة (د.ل)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أضف أي ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={addMaintenanceRecord}>إضافة</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل سجل الصيانة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اللوحة</Label>
              <Input
                value={editingRecord?.billboard_name || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div>
              <Label>سبب الصيانة *</Label>
              <Input
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
            <div>
              <Label>الحالة</Label>
              <select
                className="w-full px-3 py-2 border rounded-md bg-background"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
              >
                <option value="in_progress">قيد الصيانة</option>
                <option value="completed">مكتملة</option>
              </select>
            </div>
            <div>
              <Label>التكلفة (د.ل)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={updateMaintenanceRecord}>حفظ التعديلات</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

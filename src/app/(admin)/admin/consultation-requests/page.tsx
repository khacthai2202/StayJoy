'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Clock } from 'lucide-react'

export default function ConsultationRequestsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/landing-stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !data) {
    return (
      <div className="space-y-4 animate-pulse p-6">
        <Card className="h-48 bg-muted/50 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold tracking-tight">Consultation Requests Management</h1>
      <p className="text-muted-foreground">
        Quản lý và xử lý các yêu cầu tư vấn từ khách hàng tiềm năng.
      </p>

      <Card className="shadow-sm border-amber-200 dark:border-amber-900/50">
        <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20 rounded-t-xl">
          <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Yêu cầu tư vấn mới
          </CardTitle>
          <CardDescription>
            Xử lý các khách hàng mới điền form đặt lịch nhưng chưa được gọi điện tư vấn.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-background shadow-sm">
            <div>
              <p className="font-medium text-lg">Số khách hàng Đang Chờ Tư Vấn</p>
              <p className="text-sm text-muted-foreground">Hãy gọi điện thoại tư vấn ngay để không bỏ lỡ khách hàng.</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-4xl font-bold text-amber-600">{data.kpis.pending}</div>
              <button 
                onClick={async () => {
                  try {
                    await fetch('/api/admin/landing-stats', { method: 'POST' });
                    // Refresh data
                    const res = await fetch('/api/admin/landing-stats');
                    setData(await res.json());
                  } catch(e) {
                    console.error(e)
                  }
                }}
                disabled={data.kpis.pending === 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-md font-medium transition-colors cursor-pointer"
              >
                Đã tư vấn xong (1)
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

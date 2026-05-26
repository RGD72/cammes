'use client'

import dynamic from 'next/dynamic'

const OrdersChart = dynamic(() => import('@/components/admin/orders-chart'), { ssr: false })

interface OrdersChartWrapperProps {
  data: Array<{ date: string; count: number }>
}

export function OrdersChartWrapper({ data }: OrdersChartWrapperProps) {
  return <OrdersChart data={data} />
}

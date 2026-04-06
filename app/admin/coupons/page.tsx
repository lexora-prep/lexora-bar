export default function AdminCouponsPage() {
  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex items-start justify-between border border-[#DDD7CC] bg-white px-5 py-4">
          <div>
            <div className="text-[28px] font-semibold text-[#111827]">Coupons</div>
            <div className="mt-1 text-[14px] text-[#6B7280]">
              Coupon and discount management.
            </div>
          </div>

          <button className="border border-[#111111] bg-[#111111] px-4 py-2 text-[13px] font-medium text-white">
            Create Coupon
          </button>
        </div>

        <div className="border border-[#DDD7CC] bg-white px-5 py-4 text-[14px] text-[#6B7280]">
          Connect this page to your coupon creation and redemption data next.
        </div>
      </div>
    </div>
  )
}
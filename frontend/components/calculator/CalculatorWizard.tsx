'use client';

import { useState } from 'react';

interface Prices {
  ongridHardware: number;
  ongridLabor: number;
  hybridHardware: number;
  hybridLabor: number;
  battery5: number;
  battery10: number;
  battery15: number;
}

const BATTERY_BONUS: Record<number, number> = { 0: 0, 50000: 10, 90000: 18, 125000: 25 };
const TIME_BASE: Record<string, number> = { day: 85, night: 40, allday: 62 };

function fmt(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function SectionCard({ num, title, desc, children }: { num: number; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {num}
        </div>
        <div>
          <h3 className="font-semibold text-[var(--color-text)]">{title}</h3>
          {desc && <p className="text-xs text-[var(--color-muted)] mt-0.5">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function OptionCard({
  selected, onClick, icon, title, desc, price,
}: {
  selected: boolean; onClick: () => void; icon: string; title: string; desc?: string; price?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all w-full ${
        selected
          ? 'border-[var(--color-primary)] bg-blue-50'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-blue-50/30'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{title}</div>
        {desc && <div className="text-xs text-[var(--color-muted)]">{desc}</div>}
      </div>
      {price && <span className="text-xs font-semibold text-[var(--color-primary)] whitespace-nowrap">{price}</span>}
      {selected && (
        <span className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white text-xs flex items-center justify-center flex-shrink-0">✓</span>
      )}
    </button>
  );
}

function PresetBtns({ presets, onSelect }: { presets: { label: string; val: number }[]; onSelect: (v: number) => void }) {
  return (
    <div className="mt-3">
      <p className="text-xs text-[var(--color-muted)] mb-1.5">👆 กดเลือกค่าด่วน</p>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onSelect(p.val)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--color-primary)] text-[var(--color-primary)] bg-white hover:bg-[var(--color-primary)] hover:text-white active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CalculatorWizard({ prices }: { prices: Prices }) {
  const [monthlyBill, setMonthlyBill] = useState(3000);
  const [unitPrice,   setUnitPrice]   = useState(4.5);
  const [usageTime,   setUsageTime]   = useState('allday');
  const [systemKw,    setSystemKw]    = useState(5);
  const [systemType,  setSystemType]  = useState<'ongrid' | 'hybrid'>('ongrid');
  const [batteryCost, setBatteryCost] = useState(0);

  // Live calculation
  const coverageMap: Record<string, number> = { day: 1, allday: 0.75, night: 0.5 };
  const recommendedKw = Math.ceil((monthlyBill / unitPrice / 30 * (coverageMap[usageTime] ?? 0.75)) / (4.5 * 0.8) * 10) / 10;

  const hardwareCost = systemKw * (systemType === 'hybrid' ? prices.hybridHardware : prices.ongridHardware);
  const laborCost    = systemKw * (systemType === 'hybrid' ? prices.hybridLabor    : prices.ongridLabor);
  const totalInstall = hardwareCost + laborCost + batteryCost;
  const timeBase     = TIME_BASE[usageTime] ?? 62;
  const bonus        = BATTERY_BONUS[batteryCost] ?? 0;
  const effectiveUse = Math.min(100, timeBase + bonus);
  const monthlySave  = monthlyBill * (effectiveUse / 100) * 0.9;
  const paybackMo    = totalInstall / monthlySave;

  const batteryOptions = [
    { cost: 0,                icon: '🚫', title: 'ไม่มีแบตเตอรี่', desc: 'ประหยัดค่าใช้จ่าย',  price: 'ฟรี' },
    { cost: prices.battery5,  icon: '🔋', title: '5 kWh',          desc: 'สำรองไฟ 3–5 ชม.',   price: `฿${fmt(prices.battery5)}` },
    { cost: prices.battery10, icon: '🔋', title: '10 kWh',         desc: 'สำรองไฟ 6–10 ชม.',  price: `฿${fmt(prices.battery10)}` },
    { cost: prices.battery15, icon: '🔋', title: '15 kWh',         desc: 'สำรองไฟ 10–15 ชม.', price: `฿${fmt(prices.battery15)}` },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

      {/* ── Left: Input sections ── */}
      <div className="lg:col-span-3 space-y-4">

        {/* 1. Monthly Bill */}
        <SectionCard num={1} title="ค่าไฟต่อเดือน" desc="กรอกค่าไฟเฉลี่ยต่อเดือนของคุณ">
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="form-input flex-1"
              value={monthlyBill}
              onChange={(e) => setMonthlyBill(Math.max(100, parseInt(e.target.value) || 0))}
              min={100}
              step={100}
            />
            <span className="text-sm text-[var(--color-muted)] whitespace-nowrap">บาท/เดือน</span>
          </div>
          <PresetBtns
            presets={[{ label: '1,500฿', val: 1500 }, { label: '2,500฿', val: 2500 }, { label: '4,000฿', val: 4000 }, { label: '7,000฿', val: 7000 }]}
            onSelect={setMonthlyBill}
          />
        </SectionCard>

        {/* 2. Unit Price */}
        <SectionCard num={2} title="ค่าไฟต่อหน่วย" desc="ดูจากใบเสร็จค่าไฟหรือใช้ค่าเฉลี่ย">
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="form-input flex-1"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 4.5)}
              min={1}
              max={10}
              step={0.1}
            />
            <span className="text-sm text-[var(--color-muted)] whitespace-nowrap">บาท/kWh</span>
          </div>
          <PresetBtns
            presets={[{ label: '3.50฿', val: 3.5 }, { label: '4.00฿', val: 4.0 }, { label: '4.50฿ ⭐', val: 4.5 }, { label: '4.80฿', val: 4.8 }]}
            onSelect={setUnitPrice}
          />
        </SectionCard>

        {/* 3. Usage Time */}
        <SectionCard num={3} title="ช่วงเวลาใช้ไฟ" desc="คุณใช้ไฟในช่วงใดเป็นหลัก?">
          <div className="space-y-2">
            <OptionCard selected={usageTime === 'day'}    onClick={() => setUsageTime('day')}    icon="☀️" title="กลางวัน"  desc="ส่วนใหญ่ใช้ตอนกลางวัน (โรงงาน สำนักงาน)" />
            <OptionCard selected={usageTime === 'night'}  onClick={() => setUsageTime('night')}  icon="🌙" title="กลางคืน" desc="ส่วนใหญ่ใช้ตอนกลางคืน" />
            <OptionCard selected={usageTime === 'allday'} onClick={() => setUsageTime('allday')} icon="🌓" title="ตลอดวัน" desc="ใช้ทั้งกลางวันและกลางคืน (ที่อยู่อาศัย)" />
          </div>
        </SectionCard>

        {/* 4. System Size */}
        <SectionCard num={4} title="ขนาดระบบ (kW)" desc="ขนาดระบบที่ต้องการติดตั้ง">
          <div className="p-3 bg-blue-50 rounded-xl mb-3 text-sm">
            💡 แนะนำ: <strong className="text-[var(--color-primary)]">{recommendedKw} kW</strong>
            <span className="text-[var(--color-muted)] ml-1">(จากค่าไฟที่กรอก)</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="form-input flex-1"
              value={systemKw}
              onChange={(e) => setSystemKw(Math.max(1, parseFloat(e.target.value) || 0))}
              min={1}
              max={100}
              step={0.5}
            />
            <span className="text-sm text-[var(--color-muted)] whitespace-nowrap">kW</span>
          </div>
          <PresetBtns
            presets={[{ label: '3 kW', val: 3 }, { label: '5 kW', val: 5 }, { label: '7 kW', val: 7 }, { label: '10 kW', val: 10 }]}
            onSelect={setSystemKw}
          />
        </SectionCard>

        {/* 5. System Type */}
        <SectionCard num={5} title="ประเภทระบบ" desc="เลือกประเภทระบบที่ต้องการ">
          <div className="space-y-2">
            <OptionCard
              selected={systemType === 'ongrid'}
              onClick={() => setSystemType('ongrid')}
              icon="🔌"
              title="On-Grid"
              desc="เชื่อมต่อกับการไฟฟ้า — ประหยัดค่าไฟกลางวัน"
              price={`฿${fmt(prices.ongridHardware + prices.ongridLabor)}/kW`}
            />
            <OptionCard
              selected={systemType === 'hybrid'}
              onClick={() => setSystemType('hybrid')}
              icon="⚡"
              title="Hybrid"
              desc="รองรับแบตเตอรี่ — ใช้ไฟได้ตลอด 24 ชม."
              price={`฿${fmt(prices.hybridHardware + prices.hybridLabor)}/kW`}
            />
          </div>
        </SectionCard>

        {/* 6. Battery */}
        <SectionCard num={6} title="แบตเตอรี่" desc="เพิ่มแบตเตอรี่เพื่อสำรองไฟ (ไม่บังคับ)">
          {systemType === 'ongrid' && (
            <div className="alert alert-info mb-3 text-xs">
              💡 ระบบ On-Grid สามารถเพิ่มแบตเตอรี่ได้ แต่แนะนำ Hybrid สำหรับแบตฯ ใหญ่
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {batteryOptions.map((b) => (
              <OptionCard
                key={b.cost}
                selected={batteryCost === b.cost}
                onClick={() => setBatteryCost(b.cost)}
                icon={b.icon}
                title={b.title}
                desc={b.desc}
                price={b.price}
              />
            ))}
          </div>
        </SectionCard>

      </div>

      {/* ── Right: Live result panel ── */}
      <div className="lg:col-span-2 lg:sticky lg:top-24">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0">📊</span>
            <h3 className="font-bold text-[var(--color-text)]">ผลการประเมิน</h3>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">🔌 ค่าอุปกรณ์โซลาร์</span>
              <strong>฿{fmt(hardwareCost)}</strong>
            </div>
            {batteryCost > 0 && (
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">🔋 ค่าแบตเตอรี่</span>
                <strong>฿{fmt(batteryCost)}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">👷 ค่าแรงติดตั้ง</span>
              <strong>฿{fmt(laborCost)}</strong>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="flex justify-between text-base font-bold">
              <span>💡 รวมทั้งหมด</span>
              <span className="text-[var(--color-primary)]">฿{fmt(totalInstall)}</span>
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">💰 ประหยัดต่อเดือน</span>
              <strong className="text-green-600">฿{fmt(monthlySave)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">⏱️ คืนทุนภายใน</span>
              <strong>
                {paybackMo < 12
                  ? `${Math.ceil(paybackMo)} เดือน`
                  : `${(paybackMo / 12).toFixed(1)} ปี`}
              </strong>
            </div>
          </div>

          <p className="mt-4 text-xs text-[var(--color-muted)] text-center bg-[var(--color-bg)] rounded-xl p-3">
            ราคาเป็นการประมาณเบื้องต้น ขึ้นอยู่กับสภาพหลังคาและวัสดุที่เลือก
          </p>

          <a href="/installers" className="btn btn-primary w-full justify-center mt-4 inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            ค้นหาผู้ติดตั้ง
          </a>
        </div>
      </div>

    </div>
  );
}

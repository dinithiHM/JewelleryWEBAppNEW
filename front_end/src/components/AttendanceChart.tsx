"use client";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "./TranslatedText";
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  {
    name: "Mon",
    Mahiyangana: 60,
    MahaOya: 40,
  },
  {
    name: "Tue",
    Mahiyangana: 70,
    MahaOya: 60,
  },
  {
    name: "Wed",
    Mahiyangana: 90,
    MahaOya: 75,
  },
  {
    name: "Thu",
    Mahiyangana: 90,
    MahaOya: 75,
  },
  {
    name: "Fri",
    Mahiyangana: 65,
    MahaOya: 55,
  },
];

const AttendanceChart = () => {
  // Use language context to trigger re-renders when language changes
  useLanguage();
  return (
    <div className="bg-[#FFF6BD] rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
      <h1 className="text-lg font-semibold text-black">
        <TranslatedText textKey="dashboard.attendance" fallback="Attendance" />
      </h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart width={500} height={300} data={data} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tick={{ fill: "#000000" }} // Set tick text color to black
            tickLine={false}
          />
          <YAxis axisLine={false} tick={{ fill: "#000000" }} tickLine={false} /> {/* Set Y-axis text color to black */}
          <Tooltip
            contentStyle={{ borderRadius: "10px", borderColor: "lightgray" }}
          />
          <Legend
            align="left"
            verticalAlign="top"
            formatter={(value) => <span style={{ color: "black" }}>{value}</span>} // Set legend text color to black
            wrapperStyle={{ paddingTop: "20px", paddingBottom: "40px" }}
          />
          <Bar
            dataKey="Mahiyangana"
            fill="#D4AF37" // Metallic gold
            legendType="circle"
            radius={[10, 10, 0, 0]}
          />
          <Bar
            dataKey="MahaOya"
            fill="#B8860B" // Dark goldenrod
            legendType="circle"
            radius={[10, 10, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttendanceChart;

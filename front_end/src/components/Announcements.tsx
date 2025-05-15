import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "./TranslatedText";

const Announcements = () => {
  // Use language context to trigger re-renders when language changes
  useLanguage();
  return (
    <div style={{ backgroundColor: "#FFF6BD" }} className="p-4 rounded-md"> {/* Set background color here */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          <TranslatedText textKey="dashboard.announcements" fallback="Announcements" />
        </h1>
        <span className="text-xs text-gray-400">
          <TranslatedText textKey="dashboard.viewAll" fallback="View All" />
        </span>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        <div className="bg-yellow rounded-md p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Lorem ipsum dolor sit</h2>
            <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
              2025-01-01
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatum,
            expedita. Rerum, quidem facilis?
          </p>
        </div>
        <div className="bg-lamaPurpleLight rounded-md p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Lorem ipsum dolor sit</h2>
            <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
              2025-01-01
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatum,
            expedita. Rerum, quidem facilis?
          </p>
        </div>
        <div className="bg-lamaYellowLight rounded-md p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Lorem ipsum dolor sit</h2>
            <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
              2025-01-01
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatum,
            expedita. Rerum, quidem facilis?
          </p>
        </div>
      </div>
    </div>
  );
};

export default Announcements;

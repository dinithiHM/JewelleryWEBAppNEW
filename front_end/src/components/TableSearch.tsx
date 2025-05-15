import { Search } from "lucide-react";
import { useState } from "react";

interface TableSearchProps {
  onSearch?: (searchTerm: string) => void;
  placeholder?: string;
}

const TableSearch = ({
  onSearch = () => {},
  placeholder = "Search..."
}: TableSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  return (
    <div className="w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2 bg-white">
      <Search size={16} className="text-gray-500" />
      <input
        type="text"
        value={searchTerm}
        onChange={handleSearch}
        placeholder={placeholder}
        className="w-[200px] p-2 bg-transparent outline-none"
      />
    </div>
  );
};

export default TableSearch;

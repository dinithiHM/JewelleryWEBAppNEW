"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLanguage } from "@/contexts/LanguageContext";

// Define the form schema with Zod
const schema = z.object({
  category_name: z.string().min(1, { message: "Category name is required" }),
  description: z.string().optional(),
});

type FormInputs = z.infer<typeof schema>;

interface CategoryFormProps {
  type: "create" | "update" | "view";
  data?: {
    category_id?: number;
    category_name?: string;
    description?: string | null;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const CategoryForm = ({ type, data, onSuccess, onCancel }: CategoryFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  // Initialize form with react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>({
    resolver: zodResolver(schema),
    defaultValues: {
      category_name: data?.category_name || "",
      description: data?.description || "",
    },
  });

  // Handle form submission
  const onSubmit = async (formData: FormInputs) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = type === "create"
        ? "http://localhost:3002/admin/add_category"
        : `http://localhost:3002/admin/edit_category/${data?.category_id}`;

      const method = type === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${type} category: ${response.status}`);
      }

      const responseData = await response.json();
      if (responseData.Status) {
        onSuccess();
      } else {
        throw new Error(responseData.Error || `Failed to ${type} category`);
      }
    } catch (err: any) {
      setError(err.message);
      console.error(`Error ${type === "create" ? "creating" : "updating"} category:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If in view mode, render a read-only view
  if (type === "view") {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {language === "ta" ? "வகை விவரங்கள்" : "Category Details"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              {language === "ta" ? "வகை ஐடி" : "Category ID"}
            </h3>
            <p className="p-2 bg-gray-50 rounded-md">{data?.category_id}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              {language === "ta" ? "வகை பெயர்" : "Category Name"}
            </h3>
            <p className="p-2 bg-gray-50 rounded-md">{data?.category_name}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">
              {language === "ta" ? "விளக்கம்" : "Description"}
            </h3>
            <p className="p-2 bg-gray-50 rounded-md min-h-[80px]">
              {data?.description || "-"}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            {language === "ta" ? "மூடு" : "Close"}
          </button>
        </div>
      </div>
    );
  }

  // For create and update modes, render the form
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {type === "create"
            ? language === "ta" ? "புதிய வகை உருவாக்கம்" : "Create New Category"
            : language === "ta" ? "வகை விவரங்களைத் திருத்து" : "Edit Category Details"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {language === "ta" ? "வகை பெயர்" : "Category Name"}*
          </label>
          <input
            type="text"
            {...register("category_name")}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          />
          {errors.category_name && (
            <p className="mt-1 text-sm text-red-500">
              {errors.category_name.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {language === "ta" ? "விளக்கம்" : "Description"}
          </label>
          <textarea
            {...register("description")}
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">
              {errors.description.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          disabled={isSubmitting}
        >
          {language === "ta" ? "ரத்து செய்" : "Cancel"}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-lamaYellow text-black rounded-md hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span>{language === "ta" ? "சமர்ப்பிக்கிறது..." : "Submitting..."}</span>
          ) : (
            <span>
              {type === "create"
                ? language === "ta" ? "உருவாக்கு" : "Create"
                : language === "ta" ? "புதுப்பி" : "Update"}
            </span>
          )}
        </button>
      </div>
    </form>
  );
};

export default CategoryForm;

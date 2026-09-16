import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  features?: string[];
}

export default function ComingSoonView({
  title,
  description,
  category,
  icon: Icon,
  features = [
    "Real-time synchronized data processing",
    "Comprehensive audit trails and reporting",
    "Optimized quick-access keyboard workflows",
    "Exportable GST & compliance ready invoices",
  ],
}: ComingSoonProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Back button */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#5E2B9D] mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Products</span>
      </Link>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-10 shadow-xs relative overflow-hidden text-center flex flex-col items-center">
        {/* Background decorative glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-100/50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none"></div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-[#5E2B9D] border border-purple-200 mb-6">
          <Clock className="w-3.5 h-3.5" />
          <span>Coming Soon • {category}</span>
        </div>

        {/* Big Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#5E2B9D] to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 mb-6">
          <Icon className="w-10 h-10" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
          {title} Module
        </h1>

        <p className="text-slate-500 max-w-lg text-sm mb-8 leading-relaxed">
          {description}
        </p>

        {/* Planned Features List */}
        <div className="w-full max-w-md bg-slate-50 rounded-xl p-5 border border-slate-100 text-left mb-8">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#5E2B9D]" />
            <span>Upcoming Features for {title}</span>
          </div>
          <ul className="space-y-2">
            {features.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-600">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5E2B9D]"></div>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            href="/products"
            className="px-6 py-2.5 rounded-xl bg-[#5E2B9D] hover:bg-[#4D2382] text-white font-medium text-xs transition-all shadow-md shadow-purple-500/20"
          >
            View Products
          </Link>
          <Link
            href="/settings"
            className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
          >
            Module Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

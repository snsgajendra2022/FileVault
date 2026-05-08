import { useTranslation } from 'react-i18next';
import LaborSheet from "./LaborSheet";

export default function SheetPage() {
  useTranslation();
  return <LaborSheet />;
}

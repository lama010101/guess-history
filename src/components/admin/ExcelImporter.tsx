import { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { HistoricalImage } from "@/types/game";

interface ExcelImporterProps {
  onImportComplete: (events: HistoricalImage[]) => void;
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;
}

interface ExcelImageData {
  description?: string;
  year?: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  location?: string;
  country?: string;
  title?: string;
  locationName?: string;
  [key: string]: any;
}

const ExcelImporter = ({ onImportComplete, isUploading, setIsUploading }: ExcelImporterProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const isValidWikimediaUrl = (url: string): boolean => {
    return url.includes('wikimedia.org') || 
           url.includes('wikipedia.org') || 
           url.startsWith('http') && 
           (url.endsWith('.jpg') || 
            url.endsWith('.jpeg') || 
            url.endsWith('.png') || 
            url.endsWith('.gif'));
  };

  const fixWikimediaUrl = (url: string): string => {
    if (url.includes('commons.wikimedia.org/wiki/File:')) {
      const fileNameMatch = url.match(/File:([^/]+)$/);
      if (fileNameMatch && fileNameMatch[1]) {
        const fileName = fileNameMatch[1];
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=800`;
      }
    }
    return url;
  };

  const processExcelFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const data = await readExcelFile(file);
      console.log("Parsed Excel data:", data);
      
      const validData = data.filter(row => {
        const hasRequiredFields = 
          row.description && 
          row.year && 
          (row.latitude !== undefined && row.latitude !== null) && 
          (row.longitude !== undefined && row.longitude !== null) &&
          row.imageUrl;
          
        if (!hasRequiredFields) {
          console.warn("Skipping invalid row:", row);
          return false;
        }
        
        if (row.imageUrl && !isValidWikimediaUrl(row.imageUrl)) {
          const fixedUrl = fixWikimediaUrl(row.imageUrl);
          if (isValidWikimediaUrl(fixedUrl)) {
            row.imageUrl = fixedUrl;
            return true;
          }
          console.warn("Skipping row with invalid image URL:", row);
          return false;
        }
        
        return true;
      });
      
      if (validData.length === 0) {
        toast({
          title: "No Valid Data Found",
          description: "No valid records were found in the Excel file. Events must include description, year, coordinates, and a valid image URL.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      
      if (validData.length < data.length) {
        toast({
          title: "Some Entries Skipped",
          description: `${data.length - validData.length} entries were skipped due to missing required fields or invalid image URLs.`,
          variant: "destructive",
        });
      }
      
      const newEvents: HistoricalImage[] = validData.map((row, index) => {
        const latitude = typeof row.latitude === 'number' ? row.latitude : parseFloat(String(row.latitude)) || 0;
        const longitude = typeof row.longitude === 'number' ? row.longitude : parseFloat(String(row.longitude)) || 0;
        const year = typeof row.year === 'number' ? row.year : parseInt(String(row.year)) || 2000;
        
        const existingEvents = localStorage.getItem('savedEvents');
        let maxId = 0;
        if (existingEvents) {
          try {
            const parsedEvents = JSON.parse(existingEvents);
            if (Array.isArray(parsedEvents) && parsedEvents.length > 0) {
              maxId = Math.max(...parsedEvents.map(e => e.id));
            }
          } catch (e) {
            console.error("Error parsing existing events:", e);
          }
        }
        
        const newId = maxId + index + 1;
        
        let description = row.description || '';
        if (!description && row.title) {
          description = row.title;
        }
        
        let locationName = row.locationName || row.location || '';
        if (row.country && !locationName.includes(row.country)) {
          locationName = locationName ? `${locationName}, ${row.country}` : row.country;
        }
        
        return {
          id: newId,
          title: row.title || '',
          description: description || 'Unknown location',
          year: year,
          location: { 
            lat: latitude, 
            lng: longitude 
          },
          locationName: locationName,
          country: row.country || locationName.split(',').pop()?.trim() || '',
          src: row.imageUrl || 'https://via.placeholder.com/500'
        };
      });
      
      console.log("Converted to HistoricalImages:", newEvents);
      
      onImportComplete(newEvents);
    } catch (error) {
      console.error("Excel processing error:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error processing the Excel file. Check the console for details.",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  const readExcelFile = useCallback((file: File): Promise<ExcelImageData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            defval: ""
          });
          
          console.log("Raw Excel data with headers:", rawData);
          
          if (rawData.length < 2) {
            throw new Error("Excel file must have at least a header row and one data row");
          }
          
          const headers = (rawData[0] as string[]).map(header => 
            String(header).toLowerCase().trim()
          );
          
          console.log("Normalized headers:", headers);
          
          const fieldMap: Record<string, string> = {};
          
          const fieldVariations: Record<string, string[]> = {
            description: ['description', 'desc', 'text', 'info', 'details', 'caption', 'notes'],
            title: ['title', 'name', 'heading', 'subject', 'event'],
            year: ['year', 'date', 'time', 'period', 'era', 'when'],
            latitude: ['latitude', 'lat', 'y', 'yloc', 'latitude_deg'],
            longitude: ['longitude', 'lng', 'long', 'x', 'xloc', 'longitude_deg'],
            imageUrl: ['imageurl', 'image', 'img', 'url', 'src', 'picture', 'photo', 'link'],
            location: ['location', 'place', 'city', 'town', 'address', 'site', 'spot', 'where'],
            country: ['country', 'nation', 'land', 'territory', 'state', 'region'],
            locationName: ['locationname', 'placename', 'placefull', 'fullname', 'fullplace']
          };
          
          headers.forEach((header, index) => {
            for (const [field, variations] of Object.entries(fieldVariations)) {
              if (variations.some(v => header.includes(v))) {
                fieldMap[index] = field;
                break;
              }
            }
          });
          
          console.log("Field mapping:", fieldMap);
          
          const processedData: ExcelImageData[] = [];
          
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i] as any[];
            const item: ExcelImageData = {};
            
            for (let j = 0; j < row.length; j++) {
              const field = fieldMap[j];
              if (field) {
                const value = row[j];
                
                if (field === 'year') {
                  item[field] = parseInt(String(value)) || null;
                } else if (field === 'latitude' || field === 'longitude') {
                  item[field] = parseFloat(String(value)) || null;
                } else {
                  item[field] = String(value).trim();
                }
              }
            }
            
            if (Object.keys(item).length > 0) {
              processedData.push(item);
            }
          }
          
          console.log("Processed Excel data:", processedData);
          resolve(processedData);
        } catch (error) {
          console.error("Excel parsing error:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  }, []);

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processExcelFile(files[0]);
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx,.xls,.csv" 
        onChange={handleExcelChange}
      />
      <Button variant="outline" onClick={handleFileUpload} disabled={isUploading}>
        {isUploading ? (
          <span className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </span>
        ) : (
          <>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Upload Excel
          </>
        )}
      </Button>
    </>
  );
};

export default ExcelImporter;

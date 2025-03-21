
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

  const processExcelFile = async (file: File) => {
    setIsUploading(true);
    
    try {
      const data = await readExcelFile(file);
      console.log("Parsed Excel data:", data);
      
      if (data && data.length > 0) {
        // Convert Excel data to HistoricalImage format
        const newEvents: HistoricalImage[] = data.map((row, index) => {
          // Handle potential data inconsistencies
          const latitude = typeof row.latitude === 'number' ? row.latitude : parseFloat(String(row.latitude)) || 0;
          const longitude = typeof row.longitude === 'number' ? row.longitude : parseFloat(String(row.longitude)) || 0;
          const year = typeof row.year === 'number' ? row.year : parseInt(String(row.year)) || 2000;
          
          // Get existing events to generate a new unique ID
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
          
          // Generate a unique ID
          const newId = maxId + index + 1;
          
          // Build a description if not provided
          let description = row.description || '';
          if (!description && row.title) {
            description = row.title;
          }
          
          // Create locationName from location and country if provided
          let locationName = row.locationName || row.location || '';
          if (row.country && !locationName.includes(row.country)) {
            locationName = locationName ? `${locationName}, ${row.country}` : row.country;
          }
          
          // Process image URL for Wikimedia Commons and other sources
          let imageUrl = row.imageUrl || '';
          
          // Handle Wikimedia Commons links
          if (imageUrl && imageUrl.includes('wikimedia.org/wiki/File:')) {
            const fileNameMatch = imageUrl.match(/File:([^/]+)$/);
            if (fileNameMatch && fileNameMatch[1]) {
              const fileName = fileNameMatch[1];
              imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}?width=800`;
            }
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
            src: imageUrl || 'https://via.placeholder.com/500'
          };
        });
        
        console.log("Converted to HistoricalImages:", newEvents);
        
        onImportComplete(newEvents);
      } else {
        toast({
          title: "No Data Found",
          description: "The Excel file doesn't contain any valid data.",
          variant: "destructive",
        });
        setIsUploading(false);
      }
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
          
          // Get raw data with headers
          const rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            raw: false,
            defval: ""
          });
          
          console.log("Raw Excel data with headers:", rawData);
          
          if (rawData.length < 2) {
            throw new Error("Excel file must have at least a header row and one data row");
          }
          
          // Extract header row and normalize headers
          const headers = (rawData[0] as string[]).map(header => 
            String(header).toLowerCase().trim()
          );
          
          console.log("Normalized headers:", headers);
          
          // Map column indices to our expected fields
          const fieldMap: Record<string, string> = {};
          
          // Define variations of each field name we want to capture
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
          
          // Map each header to our expected fields if possible
          headers.forEach((header, index) => {
            for (const [field, variations] of Object.entries(fieldVariations)) {
              if (variations.some(v => header.includes(v))) {
                fieldMap[index] = field;
                break;
              }
            }
          });
          
          console.log("Field mapping:", fieldMap);
          
          // Process data rows
          const processedData: ExcelImageData[] = [];
          
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i] as any[];
            const item: ExcelImageData = {};
            
            // Map each cell to the appropriate field based on the mapping
            for (let j = 0; j < row.length; j++) {
              const field = fieldMap[j];
              if (field) {
                const value = row[j];
                
                // Convert to appropriate type
                if (field === 'year') {
                  item[field] = parseInt(String(value)) || null;
                } else if (field === 'latitude' || field === 'longitude') {
                  item[field] = parseFloat(String(value)) || null;
                } else {
                  item[field] = String(value).trim();
                }
              }
            }
            
            // Only add if we have at least some basic data
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

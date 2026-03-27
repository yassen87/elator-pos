const { jsPDF } = require("jspdf");
const fs = require("fs");

async function generatePDF() {
    const doc = new jsPDF();
    
    // Note: Standard jsPDF without fonts doesn't support Arabic well.
    // I will write it in English first and then try to provide a solution
    // OR I will create a beautiful Markdown file which the user can save as PDF.
    
    doc.setFontSize(22);
    doc.text("Perfume Shop Management System", 105, 20, { align: "center" });
    
    doc.setFontSize(16);
    doc.text("Features Overview", 20, 40);
    
    doc.setFontSize(12);
    const features = [
        "1. Advanced Dashboard: Daily, monthly, and yearly sales analytics.",
        "2. Inventory Management: Track oils, perfumes, and ready-made products.",
        "3. Smart Shortages System: Automatic alerts and lists for low-stock items.",
        "4. Professional POS: Support for custom perfume formulas and direct sales.",
        "5. Thermal Printing: Professional Arabic invoices with sequential numbering.",
        "6. Returns Management: Easy handling of returns and automatic stock updates.",
        "7. Cashier Management: Role-based access and password management.",
        "8. Customer Records: Database for customer history and interactions.",
        "9. Developer Portal: Dedicated view for system management and updates.",
        "10. Auto-updates: Seamless GitHub integration for new versions.",
        "11. Modern UI: Stunning RTL design optimized for perfume shops."
    ];
    
    let y = 55;
    features.forEach(feature => {
        doc.text(feature, 20, y);
        y += 10;
    });
    
    doc.save("System_Features.pdf");
    
    // Since doc.save in Node doesn't work the same as browser, 
    // we use output('arraybuffer') and write it via fs
    const data = doc.output();
    fs.writeFileSync("System_Features.pdf", data, "binary");
    console.log("PDF Created Successfully!");
}

generatePDF().catch(err => console.error(err));

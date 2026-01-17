import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import type { MeetingInfo } from '../types/types';

export class WordExporter {
  static async exportToWord(
    meetingInfo: MeetingInfo,
    notesHtml: string,
    fileName: string
  ): Promise<void> {
    // Remove timestamps from HTML
    const cleanHtml = this.removeTimestamps(notesHtml);
    
    // Parse HTML to extract formatted content
    const paragraphs = this.parseHtmlToParagraphs(cleanHtml);
    
    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: 'BÁO CÁO CUỘC HỌP',
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),
            
            // Meeting information
            new Paragraph({
              text: 'THÔNG TIN CUỘC HỌP',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 200 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({ text: 'Tiêu đề: ', bold: true }),
                new TextRun({ text: meetingInfo.title })
              ],
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({ text: 'Ngày: ', bold: true }),
                new TextRun({ text: meetingInfo.date })
              ],
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({ text: 'Giờ: ', bold: true }),
                new TextRun({ text: meetingInfo.time })
              ],
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({ text: 'Địa điểm: ', bold: true }),
                new TextRun({ text: meetingInfo.location || 'N/A' })
              ],
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({ text: 'Chủ trì: ', bold: true }),
                new TextRun({ text: meetingInfo.host || 'N/A' })
              ],
              spacing: { after: 100 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({ text: 'Thành phần tham dự: ', bold: true }),
                new TextRun({ text: meetingInfo.attendees || 'N/A' })
              ],
              spacing: { after: 300 }
            }),
            
            // Notes content
            new Paragraph({
              text: 'NỘI DUNG CUỘC HỌP',
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 200 }
            }),
            
            ...paragraphs
          ]
        }
      ]
    });
    
    // Generate and save
    const { Packer } = await import('docx');
    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
  }
  
  private static removeTimestamps(html: string): string {
    // Remove timestamp patterns like [00:00:15]
    return html.replace(/\[?\d{2}:\d{2}:\d{2}\]?\s*/g, '');
  }
  
  private static parseHtmlToParagraphs(html: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    // Create temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Get all paragraph elements
    const elements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
    
    elements.forEach((element) => {
      const textRuns = this.parseElementToTextRuns(element as HTMLElement);
      
      if (textRuns.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 100 }
          })
        );
      }
    });
    
    // If no structured elements, parse plain text
    if (paragraphs.length === 0) {
      const lines = tempDiv.textContent?.split('\n') || [];
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed) {
          paragraphs.push(
            new Paragraph({
              text: trimmed,
              spacing: { after: 100 }
            })
          );
        }
      });
    }
    
    return paragraphs;
  }
  
  private static parseElementToTextRuns(element: HTMLElement): TextRun[] {
    const textRuns: TextRun[] = [];
    
    // Get all child nodes including text nodes
    element.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          textRuns.push(new TextRun({ text }));
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const childElement = node as HTMLElement;
        const text = childElement.textContent?.trim();
        
        if (text) {
          const isBold = childElement.tagName === 'STRONG' || 
                        childElement.tagName === 'B' ||
                        childElement.style.fontWeight === 'bold';
          const isItalic = childElement.tagName === 'EM' || 
                          childElement.tagName === 'I' ||
                          childElement.style.fontStyle === 'italic';
          const isUnderline = childElement.tagName === 'U' ||
                             childElement.style.textDecoration?.includes('underline');
          
          textRuns.push(
            new TextRun({
              text,
              bold: isBold,
              italics: isItalic,
              underline: isUnderline ? {} : undefined
            })
          );
        }
      }
    });
    
    return textRuns;
  }
}

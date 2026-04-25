export interface AdrBookConfig {
    title: string;
    decisionsDir: string;
    specsDir: string;
    templatesDir: string;
    outputDir: string;
}
export declare function loadConfig(cwd: string): AdrBookConfig;

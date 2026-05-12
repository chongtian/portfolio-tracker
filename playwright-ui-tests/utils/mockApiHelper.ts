import * as fs from "fs";
import { LocalTestDataFilePath } from "./constants";

interface MockData {
    route: string;
    name: string;
    data: any;
}

export const getDataByRoute = (route: string) => {
    const mockData = JSON.parse(fs.readFileSync(LocalTestDataFilePath + '/mockApiResponseData.json', 'utf8')) as MockData[];
    const data = mockData.find(m => m.route === route);
    return data?.data;
}

export const getDataByName = (name: string) => {
    const mockData = JSON.parse(fs.readFileSync(LocalTestDataFilePath + '/mockApiResponseData.json', 'utf8')) as MockData[];
    const data = mockData.find(m => m.name === name);
    return data?.data;
}
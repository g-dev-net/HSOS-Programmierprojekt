export interface selectedStock {
    stock: Stock;
    bernoulli_param: number;
    gaussian_param: number;
}

export interface Stock {
    id: number;
    name: string;
    price: number;
    logo_url: string;
}
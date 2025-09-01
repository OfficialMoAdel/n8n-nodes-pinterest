import type { IDataObject } from 'n8n-workflow';

// Pinterest API Request Types
export interface CreatePinRequest {
	board_id: string;
	media_source: {
		source_type: 'image_url' | 'video_url' | 'image_upload';
		url?: string;
		media_id?: string;
	};
	description?: string;
	link?: string;
	title?: string;
	alt_text?: string;
}

export interface UpdatePinRequest {
	title?: string;
	description?: string;
	link?: string;
	board_id?: string;
	alt_text?: string;
}

export interface CreateBoardRequest {
	name: string;
	description?: string;
	privacy: 'public' | 'protected' | 'secret';
}

export interface UpdateBoardRequest {
	name?: string;
	description?: string;
	privacy?: 'public' | 'protected' | 'secret';
}

export interface MediaUploadRequest {
	media_type: 'image' | 'video';
	file: Buffer | File;
}

export interface SearchParams {
	query: string;
	limit?: number;
	bookmark?: string;
}

export interface SearchPinsParams extends SearchParams {
	creative_types?: string[];
	created_at?: string;
	is_promoted?: boolean;
	has_product?: boolean;
	is_eligible_for_related_products?: boolean;
}

export interface SearchBoardsParams extends SearchParams {
	// Additional board-specific search parameters can be added here
}

export interface TrendingParams {
	region?: string;
	trending_types?: string[];
}

export interface AnalyticsParams {
	start_date: string;
	end_date: string;
	metric_types?: string[];
	app_types?: string[];
	split_field?: string;
	ad_account_id?: string;
}

// Pinterest API Response Types
export interface PinResponse {
	id: string;
	created_at: string;
	url: string;
	title?: string;
	description?: string;
	link?: string;
	board_id: string;
	board_section_id?: string;
	alt_text?: string;
	media: {
		url: string;
		media_type: string;
		width?: number;
		height?: number;
	};
	note?: string;
	creative_type?: string;
	is_owner?: boolean;
	is_standard?: boolean;
}

export interface BoardResponse {
	id: string;
	name: string;
	description?: string;
	created_at: string;
	url: string;
	privacy: string;
	pin_count: number;
	follower_count: number;
	owner?: {
		username: string;
	};
	cover_pin?: {
		id: string;
		url: string;
	};
}

export interface UserProfileResponse {
	username: string;
	id: string;
	first_name: string;
	last_name: string;
	display_name: string;
	bio: string;
	avatar_url: string;
	profile_url: string;
	account_type: 'personal' | 'business';
	website_url?: string;
	is_verified_merchant?: boolean;
}

export interface MediaResponse {
	media_id: string;
	media_type: 'image' | 'video';
	status: 'succeeded' | 'failed' | 'processing';
}

export interface SearchResponse<T = PinResponse | BoardResponse> {
	items: T[];
	bookmark?: string;
}

export interface SearchPinsResponse extends SearchResponse<PinResponse> {}

export interface SearchBoardsResponse extends SearchResponse<BoardResponse> {}

export interface TrendingResponse {
	trends: Array<{
		keyword: string;
		pct_growth_wow?: number;
		pct_growth_yoy?: number;
		time_series?: {
			date: string;
			value: number;
		}[];
	}>;
}

export interface AnalyticsResponse {
	all_time?: IDataObject;
	daily_metrics?: IDataObject[];
}

// n8n Node Parameter Types
export interface PinCreateParams {
	boardId: string;
	mediaSource: 'url' | 'upload';
	mediaUrl?: string;
	mediaFile?: IDataObject;
	title?: string;
	description?: string;
	link?: string;
	altText?: string;
}

export interface PinUpdateParams {
	pinId: string;
	title?: string;
	description?: string;
	link?: string;
	boardId?: string;
	altText?: string;
}

export interface BoardCreateParams {
	name: string;
	description?: string;
	privacy: 'public' | 'protected' | 'secret';
}

export interface BoardUpdateParams {
	boardId: string;
	name?: string;
	description?: string;
	privacy?: 'public' | 'protected' | 'secret';
}

export interface SearchPinsNodeParams {
	query: string;
	limit?: number;
	bookmark?: string;
	creativeTypes?: string[];
	createdAt?: string;
	isPromoted?: boolean;
	hasProduct?: boolean;
	isEligibleForRelatedProducts?: boolean;
}

export interface SearchBoardsNodeParams {
	query: string;
	limit?: number;
	bookmark?: string;
}

export interface TrendingNodeParams {
	region?: string;
	trendingTypes?: string[];
}

export interface UserAnalyticsParams {
	startDate: string;
	endDate: string;
	metricTypes?: string[];
	appTypes?: string[];
	splitField?: string;
}

// Error Types
export interface PinterestApiError {
	code: number;
	message: string;
	details?: Array<{
		field: string;
		reason: string;
	}>;
}

// Rate Limiting Types
export interface RateLimitInfo {
	limit: number;
	remaining: number;
	reset: number;
}

// Batch Operation Types
export interface BatchOperationConfig {
	maxBatchSize?: number;
	maxConcurrency?: number;
	enableProgressTracking?: boolean;
	enableOptimization?: boolean;
	retryAttempts?: number;
	retryDelay?: number;
	progressCallback?: (progress: BatchOperationProgress) => void;
}

export interface BatchOperationProgress {
	total: number;
	completed: number;
	failed: number;
	percentage: number;
	currentBatch: number;
	totalBatches: number;
	estimatedTimeRemaining?: number;
	startTime: number;
	errors: BatchOperationError[];
}

export interface BatchOperationError {
	itemId: string;
	error: string;
	attempt: number;
	timestamp: number;
}

export interface BatchOperationResult<T = any> {
	success: T[];
	errors: BatchOperationError[];
	progress: BatchOperationProgress;
	optimizations: BatchOptimizations;
	summary: BatchOperationSummary;
}

export interface BatchOptimizations {
	duplicatesRemoved: number;
	requestsOptimized: number;
	cacheHits: number;
	totalSavings: number;
}

export interface BatchOperationSummary {
	operation: string;
	totalItems: number;
	successCount: number;
	errorCount: number;
	duration: number;
	averageTimePerItem: number;
	throughput: number;
}

// Security Types
export interface SecurityValidationResult {
	isValid: boolean;
	sanitizedValue?: any;
	errors?: string[];
	warnings?: string[];
}

export interface AuditLogEntry {
	timestamp: string;
	level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
	event: string;
	node_id: string;
	node_name: string;
	node_type: string;
	workflow_id?: string;
	execution_id?: string;
	session_id?: string;
	credential_hash?: string;
	details?: Record<string, any>;
}

export interface SecurityViolation {
	type: string;
	severity: 'low' | 'medium' | 'high' | 'critical';
	description: string;
	timestamp: string;
	context?: Record<string, any>;
}

export interface CredentialSecurityInfo {
	isValid: boolean;
	hasWeakSecret: boolean;
	isTestCredential: boolean;
	scopeViolations: string[];
	tokenExpiry?: number;
	securityScore: number;
}

// Utility Types
export type PinterestResource = 'pin' | 'board' | 'user' | 'search';
export type PinOperation = 'create' | 'get' | 'update' | 'delete' | 'bulk';
export type BoardOperation = 'create' | 'get' | 'update' | 'delete' | 'bulk';
export type UserOperation = 'getProfile' | 'getAnalytics';
export type SearchOperation = 'pins' | 'boards' | 'trending';

export interface OperationContext {
	resource: PinterestResource;
	operation: string;
	itemIndex: number;
	securityContext?: {
		credentialHash: string;
		sessionId: string;
		validationResults: SecurityValidationResult[];
	};
}

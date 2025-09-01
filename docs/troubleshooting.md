# Pinterest Node Troubleshooting Guide

This guide helps you resolve common issues when using the Pinterest node for n8n.

## Authentication Issues

### Error: "Authentication failed: Please check your Pinterest credentials"

**Symptoms:**

- Unable to connect to Pinterest API
- Credential test fails
- 401 Unauthorized errors

**Causes & Solutions:**

1. **Incorrect Client ID or Client Secret**

   ```
   Solution: Verify credentials in Pinterest Developer Console
   - Go to https://developers.pinterest.com/
   - Check your app's Client ID and Client Secret
   - Ensure they match exactly in n8n credentials
   ```

2. **Wrong Redirect URI**

   ```
   Solution: Update redirect URI in Pinterest app settings
   - Set to: {YOUR_N8N_URL}/rest/oauth2-credential/callback
   - Example: https://your-n8n.com/rest/oauth2-credential/callback
   - Must match exactly (including https/http)
   ```

3. **Expired Access Token**

   ```
   Solution: Reconnect your Pinterest account
   - Go to n8n Credentials → Pinterest OAuth2 API
   - Click "Reconnect Account"
   - Complete the OAuth flow again
   ```

4. **Insufficient Scopes**
   ```
   Solution: Ensure all required scopes are enabled
   - The node automatically requests all necessary scopes
   - If issues persist, recreate the credential
   ```

### Error: "Token refresh failed"

**Symptoms:**

- Workflows fail after working initially
- Intermittent authentication errors

**Solutions:**

1. **Enable Continuous Refresh Tokens**

   ```
   - In Pinterest credentials, ensure "Use Continuous Refresh" is enabled
   - This provides 60-day refresh tokens instead of legacy tokens
   - Legacy tokens will be deprecated September 25, 2025
   ```

2. **Recreate Credentials**
   ```
   - Delete existing Pinterest credentials
   - Create new credentials with continuous refresh enabled
   - Reconnect your Pinterest account
   ```

## Rate Limiting Issues

### Error: "Rate limit exceeded"

**Symptoms:**

- 429 Too Many Requests errors
- Workflows slow down or fail
- API requests are queued

**Understanding Pinterest Rate Limits:**

- 1000 requests per hour per user
- Limits reset every hour
- Applies to all API endpoints

**Solutions:**

1. **Automatic Handling (Recommended)**

   ```
   The node automatically handles rate limits by:
   - Queuing requests when approaching limits
   - Implementing exponential backoff
   - Retrying after reset period
   ```

2. **Reduce Request Frequency**

   ```
   - Add delays between workflow executions
   - Use n8n's "Wait" node between Pinterest operations
   - Batch operations when possible
   ```

3. **Optimize Workflow Design**
   ```
   - Combine multiple operations into single requests
   - Use bulk operations for multiple pins/boards
   - Cache frequently accessed data
   ```

### Error: "Request timeout"

**Symptoms:**

- Long-running operations fail
- Timeout errors during media upload

**Solutions:**

1. **Increase Timeout Settings**

   ```
   - In n8n settings, increase HTTP request timeout
   - For large media uploads, allow 5-10 minutes
   ```

2. **Optimize Media Files**
   ```
   - Compress images before upload
   - Use appropriate file formats (JPEG for photos, PNG for graphics)
   - Stay within size limits (10MB images, 100MB videos)
   ```

## Media Upload Issues

### Error: "Media upload failed: Invalid file format"

**Supported Formats:**

- **Images:** JPEG, PNG, GIF (max 10MB)
- **Videos:** MP4, MOV (max 100MB, 15 minutes)

**Solutions:**

1. **Convert File Format**

   ```
   - Use image/video conversion tools
   - Ensure proper file extensions (.jpg, .png, .gif, .mp4, .mov)
   ```

2. **Check File Integrity**
   ```
   - Verify file is not corrupted
   - Test opening file in appropriate application
   - Re-export from original source if needed
   ```

### Error: "File size exceeds limit"

**Solutions:**

1. **Compress Images**

   ```
   - Use tools like TinyPNG, ImageOptim, or Photoshop
   - Target file size under 8MB for safety margin
   - Maintain quality while reducing file size
   ```

2. **Optimize Videos**
   ```
   - Use video compression tools (HandBrake, FFmpeg)
   - Reduce resolution if necessary
   - Target file size under 90MB for safety margin
   ```

### Error: "Media upload timeout"

**Solutions:**

1. **Check Network Connection**

   ```
   - Ensure stable internet connection
   - Test upload speed to other services
   - Consider using wired connection for large files
   ```

2. **Upload During Off-Peak Hours**
   ```
   - Pinterest servers may be busy during peak times
   - Try uploading during off-peak hours
   ```

## Pin and Board Issues

### Error: "Pin creation failed: Board not found"

**Symptoms:**

- Cannot create pins on specific boards
- Board ID errors

**Solutions:**

1. **Verify Board ID**

   ```
   - Use "Get Board" operation to verify board exists
   - Check board ID format (should be numeric string)
   - Ensure you have access to the board
   ```

2. **Check Board Privacy**
   ```
   - Ensure you have permission to add pins to the board
   - Secret boards may have restricted access
   - Try with a public board first
   ```

### Error: "Board creation failed: Name already exists"

**Solutions:**

1. **Use Unique Board Names**

   ```
   - Pinterest requires unique board names per user
   - Add timestamp or unique identifier to board names
   - Check existing boards before creation
   ```

2. **Handle Existing Boards**
   ```
   - Use "Get Board" operation to check if board exists
   - Implement conditional logic in workflows
   - Update existing board instead of creating new one
   ```

## Search and Analytics Issues

### Error: "No search results found"

**Solutions:**

1. **Refine Search Query**

   ```
   - Use more specific keywords
   - Try different keyword combinations
   - Remove special characters from query
   ```

2. **Check Search Parameters**
   ```
   - Verify query parameter is not empty
   - Ensure proper encoding of special characters
   - Try broader search terms
   ```

### Error: "Analytics data not available"

**Symptoms:**

- Empty analytics responses
- Missing metrics data

**Causes & Solutions:**

1. **Insufficient Data**

   ```
   - Pinterest requires minimum activity for analytics
   - Wait 24-48 hours after pin/board creation
   - Ensure pins have some engagement
   ```

2. **Date Range Issues**
   ```
   - Use valid date ranges (not future dates)
   - Ensure end date is after start date
   - Try shorter date ranges for recent data
   ```

## Network and Connectivity Issues

### Error: "Connection refused" or "Network timeout"

**Solutions:**

1. **Check Internet Connection**

   ```
   - Verify internet connectivity
   - Test access to pinterest.com
   - Check firewall settings
   ```

2. **Verify n8n Configuration**
   ```
   - Ensure n8n can make outbound HTTPS requests
   - Check proxy settings if applicable
   - Verify SSL/TLS configuration
   ```

### Error: "SSL certificate verification failed"

**Solutions:**

1. **Update Certificates**

   ```
   - Update system SSL certificates
   - Restart n8n after certificate updates
   ```

2. **Check System Time**
   ```
   - Ensure system clock is accurate
   - SSL certificates are time-sensitive
   ```

## Workflow Design Issues

### Error: "Invalid input data format"

**Solutions:**

1. **Check Data Structure**

   ```
   - Verify input data matches expected format
   - Use n8n's data transformation nodes
   - Check for required fields
   ```

2. **Validate Input Types**
   ```
   - Ensure strings are strings, numbers are numbers
   - Convert data types as needed
   - Handle null/undefined values
   ```

### Error: "Workflow execution timeout"

**Solutions:**

1. **Optimize Workflow Performance**

   ```
   - Reduce number of API calls
   - Use batch operations
   - Implement pagination for large datasets
   ```

2. **Increase Timeout Settings**
   ```
   - Adjust n8n execution timeout settings
   - Consider breaking large operations into smaller chunks
   ```

## Debugging Tips

### Enable Debug Logging

1. **Set n8n Log Level**

   ```bash
   # Set environment variable
   export N8N_LOG_LEVEL=debug

   # Or in n8n settings
   N8N_LOG_LEVEL=debug n8n start
   ```

2. **Check n8n Logs**

   ```bash
   # View logs in real-time
   tail -f ~/.n8n/logs/n8n.log

   # Search for Pinterest-related errors
   grep -i pinterest ~/.n8n/logs/n8n.log
   ```

### Test Individual Operations

1. **Isolate the Problem**

   ```
   - Create simple workflow with single Pinterest operation
   - Test with minimal required parameters
   - Gradually add complexity
   ```

2. **Use Manual Execution**
   ```
   - Execute workflows manually for testing
   - Check each step's output
   - Verify data flow between nodes
   ```

### Validate API Responses

1. **Check Pinterest API Status**

   ```
   - Visit Pinterest Developer Status page
   - Check for known API issues
   - Verify API version compatibility
   ```

2. **Test with Pinterest API Directly**
   ```bash
   # Test authentication
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://api.pinterest.com/v5/user_account
   ```

## Getting Additional Help

### Community Resources

1. **n8n Community Forum**
   - Visit: https://community.n8n.io/
   - Search for Pinterest-related topics
   - Ask questions with detailed error information

2. **GitHub Issues**
   - Report bugs: https://github.com/your-org/n8n-nodes-pinterest/issues
   - Include error messages and workflow configuration
   - Provide steps to reproduce the issue

### Support Information to Include

When seeking help, please provide:

1. **Error Details**

   ```
   - Complete error message
   - Error code (if available)
   - When the error occurs
   ```

2. **Environment Information**

   ```
   - n8n version
   - Pinterest node version
   - Operating system
   - Node.js version
   ```

3. **Workflow Configuration**

   ```
   - Sanitized workflow JSON (remove sensitive data)
   - Pinterest operation being used
   - Input data structure
   ```

4. **Steps to Reproduce**
   ```
   - Detailed steps that lead to the error
   - Expected vs actual behavior
   - Any workarounds attempted
   ```

### Professional Support

For enterprise users requiring dedicated support:

- Email: support@your-org.com
- Include your organization details and support tier
- Provide detailed error logs and workflow configurations

---

**Remember:** Always remove sensitive information (credentials, personal data) when sharing workflow configurations or error logs for troubleshooting.

# Zync Infrastructure (Oracle Cloud)

This directory contains Terraform scripts to provision the Zync backend infrastructure on Oracle Cloud's **Always Free Tier**.

## Resources Provisioned

*   **Compute Instance**: VM.Standard.A1.Flex (ARM)
    *   4 OCPUs, 24GB RAM (Free Tier max)
    *   Ubuntu 22.04
*   **Networking**: VCN, Public Subnet, Internet Gateway
*   **Security**: Firewall rules opening ports 22 (SSH), 80 (HTTP), 443 (HTTPS), and 5000 (Backend API).
*   **Software (via Cloud-Init)**:
    *   Node.js 20
    *   Redis Server (bound to localhost)
    *   PM2 (Process Manager)
    *   Bun (JavaScript Runtime)
    *   UFW Firewall configured

## Prerequisites

1.  **Oracle Cloud Account** (Free Tier is sufficient)
2.  **Terraform CLI** installed locally
3.  **OCI CLI** installed and configured (`oci setup config`)

## Usage

1.  Initialize Terraform:
    ```bash
    cd terraform
    terraform init
    ```

2.  Create a `terraform.tfvars` file with your specific values:
    ```hcl
    compartment_id = "ocid1.compartment.oc1..aaaa..."
    region         = "us-ashburn-1"
    ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2E..."
    ```

3.  Preview the changes:
    ```bash
    terraform plan
    ```

4.  Apply the changes to create infrastructure:
    ```bash
    terraform apply
    ```

5.  **Output**:
    Terraform will output the `instance_public_ip`. You can SSH into it:
    ```bash
    ssh ubuntu@<instance_public_ip>
    ```

## Post-Provisioning

Once the server is up:
1.  Clone the Zync repository.
2.  Copy your `.env` file.
3.  Install dependencies (`npm install`).
4.  Start the app with PM2: `pm2 start index.js --name zync-backend`

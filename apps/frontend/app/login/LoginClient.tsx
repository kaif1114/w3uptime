"use client"
import { Button } from "@/components/ui/button"
import { ethers } from "ethers"



function LoginClient() {

  
    const connectWallet = async () => {
        if(!window?.ethereum) {
            alert("Please install MetaMask!")
            return
        }
        const provider = new ethers.BrowserProvider(window.ethereum);

      const accounts: string[] = await provider.send("eth_requestAccounts", []);
      console.log(accounts)
    }
  return (
    <div className="container mx-auto">
        <Button onClick={connectWallet}>Login with Metamask</Button>
    </div>
  )
}

export default LoginClient